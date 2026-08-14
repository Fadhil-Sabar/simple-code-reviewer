/**
 * Unit tests for prompt building, response parsing, and config.
 */

import { describe, expect, it } from "bun:test";
import { ConfigError, loadConfig } from "../src/lib/config";
import { LlmUpstreamError } from "../src/lib/errors";
import { buildReviewPrompt } from "../src/lib/prompt";
import { extractJsonObject, parseReview, stripCodeFences } from "../src/lib/review";

const VALID_JSON = JSON.stringify({
  score: 7,
  readability: [
    { issue: "Variable naming is too generic", suggestion: "Use a descriptive name." },
  ],
  structure: [],
  maintainability: [],
  positiveNote: "The function has a clear responsibility.",
});

describe("stripCodeFences", () => {
  it("returns plain JSON unchanged", () => {
    expect(stripCodeFences(VALID_JSON)).toBe(VALID_JSON);
  });

  it("strips ```json fences", () => {
    const fenced = "```json\n" + VALID_JSON + "\n```";
    expect(stripCodeFences(fenced)).toBe(VALID_JSON);
  });

  it("strips bare ``` fences", () => {
    const fenced = "```\n" + VALID_JSON + "\n```";
    expect(stripCodeFences(fenced)).toBe(VALID_JSON);
  });

  it("trims surrounding whitespace", () => {
    expect(stripCodeFences("  \n" + VALID_JSON + "\n  ")).toBe(VALID_JSON);
  });
});

describe("extractJsonObject", () => {
  it("extracts JSON embedded in prose", () => {
    const raw = 'Here is the review:\n' + VALID_JSON + '\nHope that helps!';
    expect(extractJsonObject(raw)).toBe(VALID_JSON);
  });

  it("throws when no object is present", () => {
    expect(() => extractJsonObject("no json here")).toThrow(LlmUpstreamError);
  });

  it("throws on unbalanced braces", () => {
    expect(() => extractJsonObject('{"score": 5')).toThrow(LlmUpstreamError);
  });

  it("respects braces inside string values", () => {
    const raw = '{"positiveNote": "looks like {this}", "score": 5}';
    expect(extractJsonObject(raw)).toBe(raw);
  });
});

describe("parseReview", () => {
  it("parses a valid review", () => {
    const review = parseReview(VALID_JSON);
    expect(review).toEqual({
      score: 7,
      readability: [{ issue: "Variable naming is too generic", suggestion: "Use a descriptive name." }],
      structure: [],
      maintainability: [],
      positiveNote: "The function has a clear responsibility.",
    });
  });

  it("parses fenced output from the LLM", () => {
    const review = parseReview("```json\n" + VALID_JSON + "\n```");
    expect(review.score).toBe(7);
  });

  it("rejects a non-integer score", () => {
    const raw = JSON.stringify({ ...JSON.parse(VALID_JSON), score: 7.5 });
    expect(() => parseReview(raw)).toThrow(LlmUpstreamError);
  });

  it("rejects an out-of-range score", () => {
    const raw = JSON.stringify({ ...JSON.parse(VALID_JSON), score: 11 });
    expect(() => parseReview(raw)).toThrow(LlmUpstreamError);
  });

  it("rejects a string score", () => {
    const raw = JSON.stringify({ ...JSON.parse(VALID_JSON), score: "seven" });
    expect(() => parseReview(raw)).toThrow(LlmUpstreamError);
  });

  it("rejects a missing positiveNote", () => {
    const { positiveNote, ...rest } = JSON.parse(VALID_JSON) as Record<string, unknown>;
    expect(() => parseReview(JSON.stringify(rest))).toThrow(LlmUpstreamError);
  });

  it("treats missing issue arrays as empty", () => {
    const { readability, structure, maintainability, ...rest } = JSON.parse(
      VALID_JSON,
    ) as Record<string, unknown>;
    const review = parseReview(JSON.stringify(rest));
    expect(review.readability).toEqual([]);
    expect(review.structure).toEqual([]);
    expect(review.maintainability).toEqual([]);
  });

  it("drops invalid entries inside issue arrays", () => {
    const base = JSON.parse(VALID_JSON) as Record<string, unknown>;
    base.readability = [
      { issue: "ok", suggestion: "fine" },
      { issue: "", suggestion: "missing issue" },
      { suggestion: "missing issue key" },
      "not an object",
      null,
    ];
    const review = parseReview(JSON.stringify(base));
    expect(review.readability).toEqual([{ issue: "ok", suggestion: "fine" }]);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseReview("{not json")).toThrow(LlmUpstreamError);
  });

  it("rejects a non-object root", () => {
    expect(() => parseReview("[1,2,3]")).toThrow(LlmUpstreamError);
  });
});

describe("buildReviewPrompt", () => {
  it("includes the code and instructs the AI to detect language", () => {
    const { system, user } = buildReviewPrompt("const x = 1;");
    expect(user).toContain("const x = 1;");
    expect(system).toContain("Detect the programming language");
    expect(system).toContain("positiveNote");
  });
});

describe("loadConfig", () => {
  const base: NodeJS.ProcessEnv = {
    LLM_API_KEY: "sk-test",
    LLM_BASE_URL: "https://llm.example.com/v1",
    LLM_MODEL: "test-model",
  };

  it("loads required values and applies defaults", () => {
    const config = loadConfig({ ...base });
    expect(config.llmApiKey).toBe("sk-test");
    expect(config.llmTimeoutMs).toBe(30_000);
    expect(config.llmMaxRetries).toBe(2);
    expect(config.maxCodeLength).toBe(20_000);
    expect(config.port).toBe(3000);
  });

  it("parses numeric overrides", () => {
    const config = loadConfig({
      ...base,
      PORT: "8080",
      LLM_TIMEOUT_MS: "5000",
      LLM_MAX_RETRIES: "4",
      MAX_CODE_LENGTH: "1000",
    });
    expect(config.port).toBe(8080);
    expect(config.llmTimeoutMs).toBe(5000);
    expect(config.llmMaxRetries).toBe(4);
    expect(config.maxCodeLength).toBe(1000);
  });

  it("throws when LLM_API_KEY is missing", () => {
    const { LLM_API_KEY: _drop, ...rest } = base;
    expect(() => loadConfig(rest)).toThrow(ConfigError);
  });

  it("throws on invalid integers", () => {
    expect(() => loadConfig({ ...base, PORT: "abc" })).toThrow(ConfigError);
  });
});
