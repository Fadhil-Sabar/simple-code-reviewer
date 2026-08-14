/**
 * Review service: orchestrates prompt building, LLM call and response parsing.
 */

import type { AppConfig } from "./config";
import { LlmUpstreamError } from "./errors";
import { completeChat } from "./llm";
import { buildReviewPrompt } from "./prompt";
import type { CodeReview } from "./types";

/** Strip markdown code fences that some providers wrap JSON in. */
export function stripCodeFences(raw: string): string {
  let text = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const match = fence.exec(text);
  if (match?.[1] !== undefined) {
    text = match[1].trim();
  }
  return text;
}

/** Remove any text outside the outermost balanced JSON object. */
export function extractJsonObject(raw: string): string {
  const start = raw.indexOf("{");
  if (start === -1) {
    throw new LlmUpstreamError("LLM response contains no JSON object.");
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i]!;
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }
  throw new LlmUpstreamError("LLM response contains an unbalanced JSON object.");
}

function isReviewIssue(value: unknown): value is { issue: string; suggestion: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.issue === "string" &&
    record.issue.trim().length > 0 &&
    typeof record.suggestion === "string" &&
    record.suggestion.trim().length > 0
  );
}

function parseIssues(value: unknown, area: string): Array<{ issue: string; suggestion: string }> {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new LlmUpstreamError(`LLM response "${area}" must be an array.`);
  }
  return value
    .filter(isReviewIssue)
    .map((item) => ({
      issue: item.issue.trim(),
      suggestion: item.suggestion.trim(),
    }));
}

/**
 * Parse and validate a raw LLM completion into a {@link CodeReview}.
 * Throws {@link LlmUpstreamError} when the response is unusable.
 */
export function parseReview(rawContent: string): CodeReview {
  const cleaned = stripCodeFences(rawContent);
  const jsonText = extractJsonObject(cleaned);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new LlmUpstreamError(
      "LLM response was not valid JSON: " + rawContent.slice(0, 200),
    );
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new LlmUpstreamError("LLM response root must be a JSON object.");
  }

  const record = parsed as Record<string, unknown>;

  const score = record.score;
  if (
    typeof score !== "number" ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > 10
  ) {
    throw new LlmUpstreamError(
      `LLM response "score" must be an integer between 0 and 10.`,
    );
  }

  const positiveNote = record.positiveNote;
  if (typeof positiveNote !== "string" || positiveNote.trim() === "") {
    throw new LlmUpstreamError(
      'LLM response "positiveNote" must be a non-empty string.',
    );
  }

  return {
    score,
    readability: parseIssues(record.readability, "readability"),
    structure: parseIssues(record.structure, "structure"),
    maintainability: parseIssues(record.maintainability, "maintainability"),
    positiveNote: positiveNote.trim(),
  };
}

/**
 * Run a full review for a code snippet.
 * Returns a validated {@link CodeReview} or throws a typed API error.
 */
export async function reviewCode(
  config: AppConfig,
  code: string,
): Promise<CodeReview> {
  const { system, user } = buildReviewPrompt(code);
  const raw = await completeChat(config, [
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
  return parseReview(raw);
}
