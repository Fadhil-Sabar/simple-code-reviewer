/**
 * Hono app assembly: CORS, error handling, routes and health check.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppConfig } from "./lib/config";
import { AppError, ValidationError } from "./lib/errors";
import { reviewRoute, type ReviewDeps } from "./routes/review";
import { ReviewRateLimiter, requestClientId } from "./lib/security";

export function createApp(config: AppConfig, deps: ReviewDeps = {}): Hono {
  const app = new Hono();

  const limiter = new ReviewRateLimiter({
    maxRequests: config.rateLimitMaxRequests ?? 10,
    windowMs: config.rateLimitWindowMs ?? 60_000,
    maxConcurrent: config.maxConcurrentReviews ?? 4,
  });

  app.use("/api/*", cors({ origin: config.corsAllowedOrigins ?? ["http://localhost:5173"] }));
  app.use("/api/review", async (c, next) => {
    const release = limiter.acquire(requestClientId(c.req.raw.headers));
    try {
      await next();
    } finally {
      release();
    }
  });

  app.onError((err, c) => {
    if (err instanceof AppError) {
      const message = err instanceof ValidationError || err.status === 413
        ? err.message
        : "Review service is temporarily unavailable. Please try again later.";
      return c.json(
        { error: { message, type: err.name } },
        err.status as ContentfulStatusCode,
      );
    }
    console.error("[api] unhandled error:", err);
    return c.json(
      { error: { message: "Internal server error.", type: "InternalServerError" } },
      500,
    );
  });

  app.notFound((c) =>
    c.json({ error: { message: "Not found.", type: "NotFound" } }, 404),
  );

  app.get("/health", (c) =>
    c.json({ status: "ok", service: "smart-code-reviewer-api" }, 200),
  );

  app.route("/api", reviewRoute(config, deps));

  return app;
}

export { ValidationError };
