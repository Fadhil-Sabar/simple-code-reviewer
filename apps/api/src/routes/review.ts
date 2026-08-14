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

async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new RequestTooLargeError();
  }

  const body = request.body;
  if (!body) {
    throw new ValidationError("Request body must be valid JSON.");
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // The request is already over the limit; cancellation failure must
          // not change the response from 413.
        }
        throw new RequestTooLargeError();
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ValidationError("Request body must be valid JSON.");
  }
}

export function reviewRoute(config: AppConfig, deps: ReviewDeps = {}): Hono {
  const app = new Hono();
  const runReview = deps.runReview ?? reviewCode;

  app.post("/review", async (c) => {
    let body: unknown;
    try {
      body = await readJsonBody(c.req.raw, config.maxRequestBodyBytes ?? 25_000);
    } catch (err) {
      if (err instanceof RequestTooLargeError) throw err;
      if (err instanceof ValidationError) throw err;
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
