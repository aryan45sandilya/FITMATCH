import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { getDb } from "../db/index.js";
import { randomToken, sha256 } from "../lib/crypto.js";
import { HttpError } from "../lib/http.js";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: "user" | "admin";
  preferredUnit: "cm" | "in";
  market: "IN" | "US" | "UK_EU";
  genderFit: string | null;
  emailVerified: boolean;
  hasPassword: boolean;
  googleLinked: boolean;
  createdAt: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: SessionUser;
    sessionId?: string;
  }
}

export const USER_COLUMNS = `u.id, u.email, u.full_name, u.role, u.preferred_unit, u.market, u.gender_fit,
  u.email_verified_at, u.password_hash IS NOT NULL AS has_password, u.google_sub IS NOT NULL AS google_linked, u.created_at`;

export function mapUser(r: Record<string, unknown>): SessionUser {
  return {
    id: r.id as string,
    email: r.email as string,
    fullName: r.full_name as string,
    role: r.role as SessionUser["role"],
    preferredUnit: r.preferred_unit as SessionUser["preferredUnit"],
    market: (r.market as SessionUser["market"]) ?? "IN",
    genderFit: (r.gender_fit as string) ?? null,
    emailVerified: Boolean(r.email_verified_at),
    hasPassword: Boolean(r.has_password),
    googleLinked: Boolean(r.google_linked),
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: config.isProd,
  path: "/",
  maxAge: config.session.ttlDays * 24 * 60 * 60 * 1000,
});

export async function createSession(res: Response, userId: string, userAgent?: string) {
  const db = await getDb();
  const token = randomToken(32);
  await db.query(
    `INSERT INTO sessions (id, user_id, expires_at, user_agent) VALUES ($1, $2, now() + make_interval(days => $3), $4)`,
    [sha256(token), userId, config.session.ttlDays, userAgent?.slice(0, 200) ?? null],
  );
  res.cookie(config.session.cookieName, token, cookieOptions());
}

export async function destroySession(req: Request, res: Response) {
  if (req.sessionId) {
    const db = await getDb();
    await db.query("DELETE FROM sessions WHERE id = $1", [req.sessionId]);
  }
  res.clearCookie(config.session.cookieName, { ...cookieOptions(), maxAge: undefined });
}

/** Loads the session user if a valid cookie is present. Never rejects. */
export async function loadSession(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[config.session.cookieName] as string | undefined;
  if (!token || token.length > 100) return next();
  try {
    const db = await getDb();
    const id = sha256(token);
    const { rows } = await db.query(
      `SELECT ${USER_COLUMNS}, s.last_seen_at FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = $1 AND s.expires_at > now()`,
      [id],
    );
    const row = rows[0];
    if (row) {
      req.user = mapUser(row);
      req.sessionId = id;
      // sliding expiry, written at most hourly
      if (Date.now() - new Date(row.last_seen_at as string).getTime() > 3600_000) {
        await db.query(
          `UPDATE sessions SET last_seen_at = now(), expires_at = now() + make_interval(days => $2) WHERE id = $1`,
          [id, config.session.ttlDays],
        );
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, "Please sign in to continue.", "unauthenticated"));
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, "Please sign in to continue.", "unauthenticated"));
  if (req.user.role !== "admin") return next(new HttpError(403, "Administrator access required.", "forbidden"));
  next();
}

/** Rejects state-changing requests from unexpected origins (defence in depth on top of SameSite=Lax). */
export function originGuard(req: Request, _res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (!origin) return next();
  const host = req.get("x-forwarded-host") ?? req.get("host");
  let sameHost = false;
  try {
    sameHost = new URL(origin).host === host;
  } catch {
    /* malformed origin */
  }
  if (sameHost || config.allowedOrigins.includes(origin)) return next();
  next(new HttpError(403, "Request origin not allowed.", "bad_origin"));
}

export function user(req: Request): SessionUser {
  if (!req.user) throw new HttpError(401, "Please sign in to continue.", "unauthenticated");
  return req.user;
}
