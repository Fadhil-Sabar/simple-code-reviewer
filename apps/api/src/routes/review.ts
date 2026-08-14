/**
 * POST /api/review
 *
 * Validates the snippet and returns a structured AI review.
 */

import { Hono } from "hono";
import { z } from "zod";
import type { AppConfig } from "../lib/config";
import { RequestTooLargeError, ValidationError } from "../lib/errors";
import { reviewCode } from "../lib/review";
import type { CodeReview, ReviewRequest } from "../lib/types";

const reviewSchema = z.object({
  code: z
    .string({ message: "code must be a string" })
    .trim()
    .min(1, "Code must not be empty."),
});

export interface ReviewDeps {
  /** Performs the LLM call. Defaults to {@link reviewCode}. */
  runReview?: (config: AppConfig, code: string) => Promise<CodeReview>;
}

export function reviewRoute(config: AppConfig, deps: ReviewDeps = {}): Hono {
  const app = new Hono();
  const runReview = deps.runReview ?? reviewCode;

  app.post("/review", async (c) => {
    let body: unknown;
    try {
      const contentLength = c.req.header("content-length");
      if (contentLength && Number(contentLength) > (config.maxRequestBodyBytes ?? 25_000)) {
        throw new RequestTooLargeError();
      }
      body = await c.req.json();
    } catch (err) {
      if (err instanceof RequestTooLargeError) throw err;
      throw new ValidationError("Request body must be valid JSON.");
    }

    let parsed: ReviewRequest;
    try {
      parsed = reviewSchema.parse(body);
    } catch (err) {
      const issue = err instanceof z.ZodError ? err.issues[0] : undefined;
      throw new ValidationError(issue?.message ?? "Invalid request body.");
    }

    if (parsed.code.length > config.maxCodeLength) {
      throw new ValidationError(
        `Code is too long (${parsed.code.length} characters). ` +
          `Maximum allowed is ${config.maxCodeLength} characters.`,
      );
    }

    const review = await runReview(config, parsed.code);
    return c.json(review, 200);
  });

  return app;
}
