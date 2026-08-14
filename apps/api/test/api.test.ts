/**
 * Integration tests for the Hono API surface.
 *
 * A stub review function is injected so no network or API key is required.
 */

import { describe, expect, it, mock } from "bun:test";
import type { AppConfig } from "../src/lib/config";
import { createApp } from "../src/app";
import { LlmAuthError, LlmTimeoutError, RateLimitError } from "../src/lib/errors";
import type { CodeReview } from "../src/lib/types";

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    llmApiKey: "sk-test",
    llmBaseUrl: "https://llm.example.com/v1",
    llmModel: "test-model",
    llmTimeoutMs: 30_000,
    llmMaxRetries: 2,
    maxCodeLength: 200,
    port: 3000,
    corsAllowedOrigins: ["http://localhost:5173"],
    maxRequestBodyBytes: 25_000,
    rateLimitMaxRequests: 10,
    rateLimitWindowMs: 60_000,
    maxConcurrentReviews: 4,
    ...overrides,
  };
}

/** Deterministic fake review used when the stub LLM is called. */
function fakeReview(code: string): CodeReview {
  return {
    score: 7,
    readability: [
      { issue: "Variable naming is too generic", suggestion: "Use a descriptive name." },
    ],
    structure: [],
    maintainability: [
      { issue: "Error handling is duplicated", suggestion: "Extract a helper." },
    ],
    positiveNote: `Reviewed ${code.length} chars.`,
  };
}

function makeApp(opts: {
  config?: Partial<AppConfig>;
  runReview?: (config: AppConfig, code: string) => Promise<CodeReview>;
} = {}) {
  const config = makeConfig(opts.config);
  return createApp(config, {
    runReview: opts.runReview ?? (async (_config, code) => fakeReview(code)),
  });
}

function postJson(app: ReturnType<typeof createApp>, path: string, body: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /health", () => {
  it("returns ok", async () => {
    const app = makeApp();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("ok");
  });
});

describe("POST /api/review success", () => {
  it("returns the structured review from the stub", async () => {
    const runReview = mock(async (_c: AppConfig, code: string) => fakeReview(code));
    const app = makeApp({ runReview });

    const res = await postJson(app, "/api/review", { code: "const x = 1;" });
    expect(res.status).toBe(200);
    expect(runReview).toHaveBeenCalledTimes(1);

    const body = (await res.json()) as CodeReview;
    expect(body.score).toBe(7);
    expect(body.readability).toHaveLength(1);
    expect(body.maintainability[0]?.issue).toBe("Error handling is duplicated");
    expect(body.positiveNote).toContain("chars");
  });

  it("passes the trimmed code to the reviewer", async () => {
    let received = "";
    const app = makeApp({
      runReview: async (_c, code) => {
        received = code;
        return fakeReview(code);
      },
    });
    await postJson(app, "/api/review", { code: "  const a = 1;  " });
    expect(received).toBe("const a = 1;");
  });
});

describe("POST /api/review validation", () => {
  it("rejects a missing body", async () => {
    const app = makeApp();
    const res = await postJson(app, "/api/review", {});
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toContain("code");
  });

  it("rejects an empty string", async () => {
    const app = makeApp();
    const res = await postJson(app, "/api/review", { code: "   " });
    expect(res.status).toBe(400);
  });

  it("rejects non-string code", async () => {
    const app = makeApp();
    const res = await postJson(app, "/api/review", { code: 42 });
    expect(res.status).toBe(400);
  });

  it("rejects invalid JSON body", async () => {
    const app = makeApp();
    const res = await app.request("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
  });

  it("rejects oversized code", async () => {
    const app = makeApp({ config: { maxCodeLength: 10 } });
    const res = await postJson(app, "/api/review", { code: "x".repeat(11) });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toContain("too long");
  });

  it("rejects a request whose declared body is too large", async () => {
    const app = makeApp({ config: { maxRequestBodyBytes: 20 } });
    const res = await app.request("/api/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "21",
      },
      body: JSON.stringify({ code: "x" }),
    });
    expect(res.status).toBe(413);
  });

  it("rejects an oversized chunked body without a content-length header", async () => {
    const app = makeApp({ config: { maxRequestBodyBytes: 20 } });
    const encoded = new TextEncoder().encode(JSON.stringify({ code: "x".repeat(20) }));
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded.slice(0, 10));
        controller.enqueue(encoded.slice(10));
        controller.close();
      },
    });
    const request = new Request("http://localhost/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    expect(request.headers.get("content-length")).toBeNull();
    const res = await app.fetch(request);
    expect(res.status).toBe(413);
  });
});

describe("error mapping", () => {
  it("maps auth errors to 401", async () => {
    const app = makeApp({
      runReview: async () => {
        throw new LlmAuthError("bad key");
      },
    });
    const res = await postJson(app, "/api/review", { code: "const a = 1;" });
    expect(res.status).toBe(401);
  });

  it("maps rate limits to 429", async () => {
    const app = makeApp({
      runReview: async () => {
        throw new RateLimitError("slow down");
      },
    });
    const res = await postJson(app, "/api/review", { code: "const a = 1;" });
    expect(res.status).toBe(429);
  });

  it("maps timeouts to 504", async () => {
    const app = makeApp({
      runReview: async () => {
        throw new LlmTimeoutError("timed out");
      },
    });
    const res = await postJson(app, "/api/review", { code: "const a = 1;" });
    expect(res.status).toBe(504);
  });

  it("maps unhandled errors to 500", async () => {
    const app = makeApp({
      runReview: async () => {
        throw new Error("boom");
      },
    });
    const res = await postJson(app, "/api/review", { code: "const a = 1;" });
    expect(res.status).toBe(500);
    const body = (await res.json()) as {
      error: { message: string; type: string };
    };
    expect(body.error.type).toBe("InternalServerError");
  });
});

describe("CORS and routing", () => {
  it("adds CORS headers to API responses", async () => {
    const app = makeApp();
    const res = await app.request("/api/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ code: "const a = 1;" }),
    });
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
  });

  it("returns 404 for unknown routes", async () => {
    const app = makeApp();
    const res = await app.request("/nope");
    expect(res.status).toBe(404);
  });

  it("returns 404 for unknown API routes", async () => {
    const app = makeApp();
    const res = await app.request("/api/nope");
    expect(res.status).toBe(404);
  });
});
