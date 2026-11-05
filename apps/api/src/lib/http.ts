import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodTypeAny, type z } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "error",
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what = "Resource") => new HttpError(404, `${what} not found`, "not_found");
export const badRequest = (message: string, details?: unknown) => new HttpError(400, message, "bad_request", details);

export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(422, "Please check the highlighted fields.", "validation_error", formatZod(result.error));
  }
  return result.data;
}

export function formatZod(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  // body-parser / JSON errors
  const status = (err as { status?: number }).status;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ error: { code: "bad_request", message: "Malformed request." } });
    return;
  }
  // Postgres constraint errors → client errors, without leaking internals
  const pgCode = (err as { code?: string }).code;
  if (pgCode === "23505") {
    res.status(409).json({ error: { code: "conflict", message: "That record already exists." } });
    return;
  }
  if (pgCode === "23514" || pgCode === "23503" || pgCode === "22P02") {
    res.status(400).json({ error: { code: "invalid_data", message: "Some values are out of range or invalid." } });
    return;
  }
  console.error("[api] unhandled error", err);
  res.status(500).json({ error: { code: "internal", message: "Something went wrong on our side." } });
}
