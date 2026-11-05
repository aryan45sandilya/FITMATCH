const env = process.env;

function list(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export const config = {
  port: Number(env.PORT ?? 4000),
  nodeEnv: env.NODE_ENV ?? "development",
  isProd: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  appOrigin: env.APP_ORIGIN ?? "http://localhost:3000",
  allowedOrigins: list(env.ALLOWED_ORIGINS, ["http://localhost:3000"]),
  databaseUrl: env.DATABASE_URL || undefined,
  pgliteDir: env.PGLITE_DIR ?? "./.pglite",
  session: {
    cookieName: "fm_session",
    ttlDays: 30,
  },
  google: {
    clientId: env.GOOGLE_CLIENT_ID || undefined,
    clientSecret: env.GOOGLE_CLIENT_SECRET || undefined,
  },
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME || undefined,
    apiKey: env.CLOUDINARY_API_KEY || undefined,
    apiSecret: env.CLOUDINARY_API_SECRET || undefined,
  },
  engine: {
    mode: (env.ENGINE_MODE === "remote" ? "remote" : "deterministic") as "remote" | "deterministic",
    remoteUrl: env.RECOMMENDER_URL || undefined,
  },
} as const;

export const googleEnabled = Boolean(config.google.clientId && config.google.clientSecret);
export const cloudinaryEnabled = Boolean(
  config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret,
);
