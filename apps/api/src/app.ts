/**
 * Hono app assembly: CORS, error handling, routes and health check.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppConfig } from "./lib/config";
import { AppError, ValidationError } from "./lib/errors";
import { reviewRoute, type ReviewDeps } from "./routes/review";

export function createApp(config: AppConfig, deps: ReviewDeps = {}): Hono {
  const app = new Hono();

  app.use("/api/*", cors());

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(
        { error: { message: err.message, type: err.name } },
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
