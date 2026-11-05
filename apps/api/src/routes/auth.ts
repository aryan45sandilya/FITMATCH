import { Router, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { config, googleEnabled } from "../config.js";
import { getDb, type Queryable } from "../db/index.js";
import { hashPassword, randomToken, sha256, verifyPassword } from "../lib/crypto.js";
import { HttpError, parse } from "../lib/http.js";
import { exposeDevLinks, mailer } from "../lib/mailer.js";
import { USER_COLUMNS, createSession, destroySession, mapUser, requireAuth, user } from "../middleware/auth.js";

export const authRouter = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { error: { code: "rate_limited", message: "Too many attempts. Please wait a few minutes and try again." } },
});

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);
const password = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200)
  .refine((p) => /[a-zA-Z]/.test(p) && /[^a-zA-Z]/.test(p), "Mix letters with numbers or symbols.");

const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(120),
  email,
  password,
  genderFit: z.enum(["menswear", "womenswear", "unisex", "no_preference"]).optional(),
  market: z.enum(["IN", "US", "UK_EU"]).optional(),
});

async function issueToken(q: Queryable, userId: string, kind: "verify_email" | "reset_password", hours: number) {
  const token = randomToken(32);
  await q.query(`UPDATE auth_tokens SET used_at = now() WHERE user_id = $1 AND kind = $2 AND used_at IS NULL`, [userId, kind]);
  await q.query(
    `INSERT INTO auth_tokens (user_id, kind, token_hash, expires_at) VALUES ($1, $2, $3, now() + make_interval(hours => $4))`,
    [userId, kind, sha256(token), hours],
  );
  return token;
}

async function sendVerification(q: Queryable, u: { id: string; email: string }) {
  const token = await issueToken(q, u.id, "verify_email", 48);
  const link = `${config.appOrigin}/verify-email?token=${token}`;
  await mailer.send({ to: u.email, subject: "Verify your FitMatch email", text: `Confirm your email address:\n${link}\n\nThis link expires in 48 hours.` });
  return exposeDevLinks() ? link : undefined;
}

authRouter.get("/providers", (_req, res) => {
  res.json({ google: googleEnabled, email: true });
});

authRouter.get("/me", (req, res) => {
  res.json({ user: req.user ?? null });
});

authRouter.post("/signup", limiter, async (req, res) => {
  const body = parse(signupSchema, req.body);
  const db = await getDb();
  const exists = await db.query("SELECT 1 FROM users WHERE lower(email) = $1", [body.email]);
  if (exists.rows.length) throw new HttpError(409, "An account with this email already exists. Try signing in.", "email_taken");

  const hash = await hashPassword(body.password);
  const { rows } = await db.query(
    `INSERT INTO users (email, full_name, password_hash, gender_fit, market) VALUES ($1, $2, $3, $4, COALESCE($5, 'IN'))
     RETURNING id, email, full_name, role, preferred_unit, market, gender_fit, email_verified_at, true AS has_password, false AS google_linked, created_at`,
    [body.email, body.fullName, hash, body.genderFit ?? null, body.market ?? null],
  );
  const u = mapUser(rows[0]!);
  const devVerificationUrl = await sendVerification(db, u);
  await createSession(res, u.id, req.get("user-agent"));
  res.status(201).json({ user: u, devVerificationUrl });
});

authRouter.post("/login", limiter, async (req, res) => {
  const body = parse(z.object({ email, password: z.string().min(1).max(200) }), req.body);
  const db = await getDb();
  const { rows } = await db.query(`SELECT ${USER_COLUMNS}, u.password_hash FROM users u WHERE lower(u.email) = $1`, [body.email]);
  const row = rows[0];
  // Always run a hash comparison to keep timing uniform.
  const ok = await verifyPassword(body.password, (row?.password_hash as string) ?? "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAA");
  if (!row || !ok) throw new HttpError(401, "That email and password combination didn't match.", "invalid_credentials");
  await createSession(res, row.id as string, req.get("user-agent"));
  res.json({ user: mapUser(row) });
});

authRouter.post("/logout", async (req, res) => {
  await destroySession(req, res);
  res.json({ ok: true });
});

authRouter.post("/verify-email", async (req, res) => {
  const { token } = parse(z.object({ token: z.string().min(10).max(100) }), req.body);
  const db = await getDb();
  const { rows } = await db.query<{ user_id: string }>(
    `UPDATE auth_tokens SET used_at = now()
     WHERE token_hash = $1 AND kind = 'verify_email' AND used_at IS NULL AND expires_at > now()
     RETURNING user_id`,
    [sha256(token)],
  );
  if (!rows[0]) throw new HttpError(400, "This verification link is invalid or has expired.", "invalid_token");
  await db.query("UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1", [rows[0].user_id]);
  res.json({ ok: true });
});

authRouter.post("/resend-verification", requireAuth, limiter, async (req, res) => {
  const u = user(req);
  if (u.emailVerified) return void res.json({ ok: true, alreadyVerified: true });
  const db = await getDb();
  const devVerificationUrl = await sendVerification(db, u);
  res.json({ ok: true, devVerificationUrl });
});

authRouter.post("/forgot-password", limiter, async (req, res) => {
  const body = parse(z.object({ email }), req.body);
  const db = await getDb();
  const { rows } = await db.query<{ id: string; email: string }>("SELECT id, email FROM users WHERE lower(email) = $1", [body.email]);
  let devResetUrl: string | undefined;
  if (rows[0]) {
    const token = await issueToken(db, rows[0].id, "reset_password", 1);
    const link = `${config.appOrigin}/reset-password?token=${token}`;
    await mailer.send({ to: rows[0].email, subject: "Reset your FitMatch password", text: `Reset your password:\n${link}\n\nThis link expires in 1 hour. If you didn't ask for this, ignore this email.` });
    if (exposeDevLinks()) devResetUrl = link;
  }
  // Same response whether or not the account exists.
  res.json({ ok: true, devResetUrl });
});

authRouter.post("/reset-password", limiter, async (req, res) => {
  const body = parse(z.object({ token: z.string().min(10).max(100), password }), req.body);
  const db = await getDb();
  const hash = await hashPassword(body.password);
  const userId = await db.tx(async (q) => {
    const { rows } = await q.query<{ user_id: string }>(
      `UPDATE auth_tokens SET used_at = now()
       WHERE token_hash = $1 AND kind = 'reset_password' AND used_at IS NULL AND expires_at > now()
       RETURNING user_id`,
      [sha256(body.token)],
    );
    if (!rows[0]) throw new HttpError(400, "This reset link is invalid or has expired.", "invalid_token");
    await q.query("UPDATE users SET password_hash = $2, email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1", [rows[0].user_id, hash]);
    await q.query("DELETE FROM sessions WHERE user_id = $1", [rows[0].user_id]);
    return rows[0].user_id;
  });
  await createSession(res, userId, req.get("user-agent"));
  res.json({ ok: true });
});

authRouter.patch("/account", requireAuth, async (req, res) => {
  const body = parse(
    z.object({
      fullName: z.string().trim().min(1).max(120).optional(),
      preferredUnit: z.enum(["cm", "in"]).optional(),
      market: z.enum(["IN", "US", "UK_EU"]).optional(),
      genderFit: z.enum(["menswear", "womenswear", "unisex", "no_preference"]).nullable().optional(),
    }),
    req.body,
  );
  const db = await getDb();
  const { rows } = await db.query(
    `UPDATE users u SET
       full_name = COALESCE($2, full_name),
       preferred_unit = COALESCE($3, preferred_unit),
       gender_fit = CASE WHEN $4::boolean THEN $5 ELSE gender_fit END,
       market = COALESCE($6, market),
       updated_at = now()
     WHERE id = $1 RETURNING ${USER_COLUMNS}`,
    [user(req).id, body.fullName ?? null, body.preferredUnit ?? null, body.genderFit !== undefined, body.genderFit ?? null, body.market ?? null],
  );
  res.json({ user: mapUser(rows[0]!) });
});

authRouter.post("/change-password", requireAuth, limiter, async (req, res) => {
  const body = parse(z.object({ currentPassword: z.string().max(200).optional(), newPassword: password }), req.body);
  const db = await getDb();
  const { rows } = await db.query<{ password_hash: string | null }>("SELECT password_hash FROM users WHERE id = $1", [user(req).id]);
  const current = rows[0]?.password_hash;
  if (current && !(await verifyPassword(body.currentPassword ?? "", current))) {
    throw new HttpError(422, "Your current password is incorrect.", "validation_error", { currentPassword: "Incorrect password." });
  }
  await db.query("UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1", [user(req).id, await hashPassword(body.newPassword)]);
  await db.query("DELETE FROM sessions WHERE user_id = $1 AND id <> $2", [user(req).id, req.sessionId]);
  res.json({ ok: true });
});

/** Permanently deletes the account and all measurement data (cascade). */
authRouter.delete("/account", requireAuth, async (req, res) => {
  const body = parse(z.object({ confirm: z.literal("DELETE") }), req.body);
  void body;
  const db = await getDb();
  await db.query("DELETE FROM users WHERE id = $1", [user(req).id]);
  await destroySession(req, res);
  res.json({ ok: true });
});

// ── Google OAuth (authorization-code flow, only when configured) ──────────────
const GOOGLE_STATE_COOKIE = "fm_oauth_state";

authRouter.get("/google", (req: Request, res: Response) => {
  if (!googleEnabled) throw new HttpError(404, "Google sign-in is not configured.", "not_configured");
  const state = randomToken(16);
  res.cookie(GOOGLE_STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", secure: config.isProd, maxAge: 10 * 60 * 1000, path: "/" });
  const params = new URLSearchParams({
    client_id: config.google.clientId!,
    redirect_uri: `${config.appOrigin}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

authRouter.get("/google/callback", async (req, res) => {
  if (!googleEnabled) throw new HttpError(404, "Google sign-in is not configured.", "not_configured");
  const { code, state } = req.query as Record<string, string | undefined>;
  const expected = req.cookies?.[GOOGLE_STATE_COOKIE];
  res.clearCookie(GOOGLE_STATE_COOKIE, { path: "/" });
  if (!code || !state || !expected || state !== expected) return res.redirect(`${config.appOrigin}/login?error=oauth_state`);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.google.clientId!,
      client_secret: config.google.clientSecret!,
      redirect_uri: `${config.appOrigin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return res.redirect(`${config.appOrigin}/login?error=oauth_exchange`);
  const tokens = (await tokenRes.json()) as { access_token?: string };
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });
  if (!infoRes.ok) return res.redirect(`${config.appOrigin}/login?error=oauth_profile`);
  const info = (await infoRes.json()) as { sub: string; email?: string; email_verified?: boolean; name?: string };
  if (!info.email || !info.email_verified) return res.redirect(`${config.appOrigin}/login?error=oauth_unverified`);

  const db = await getDb();
  const { rows } = await db.query<{ id: string; is_new: boolean }>(
    `INSERT INTO users (email, full_name, google_sub, email_verified_at)
     VALUES (lower($1), $2, $3, now())
     ON CONFLICT ((lower(email))) DO UPDATE SET google_sub = COALESCE(users.google_sub, EXCLUDED.google_sub),
       email_verified_at = COALESCE(users.email_verified_at, now()), updated_at = now()
     RETURNING id, (xmax = 0) AS is_new`,
    [info.email, info.name?.slice(0, 120) || info.email.split("@")[0], info.sub],
  );
  await createSession(res, rows[0]!.id, req.get("user-agent"));
  res.redirect(`${config.appOrigin}${rows[0]!.is_new ? "/onboarding" : "/app"}`);
});
