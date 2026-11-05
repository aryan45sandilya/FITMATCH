import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { errorHandler, notFound } from "./lib/http.js";
import { loadSession, originGuard } from "./middleware/auth.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { catalogRouter } from "./routes/catalog.js";
import { meRouter } from "./routes/me.js";
import { profilesRouter } from "./routes/profiles.js";
import { recommendRouter } from "./routes/recommend.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "same-site" } }));
  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());
  app.use(originGuard);
  app.use(loadSession);

  // Measurement data is private: never cache API responses in shared caches.
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/profiles", profilesRouter);
  app.use("/api/me", meRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api", recommendRouter);
  app.use("/api", catalogRouter);

  app.use((_req, _res, next) => next(notFound("Endpoint")));
  app.use(errorHandler);
  return app;
}
