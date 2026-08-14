/**
 * Tests for the LLM client: response_format fallback, retries, timeout,
 * auth, and rate-limit handling. Uses a stubbed global fetch.
 */

import { afterEach, describe, expect, it, mock } from "bun:test";
import type { AppConfig } from "../src/lib/config";
import {
  LlmAuthError,
  LlmTimeoutError,
  LlmUpstreamError,
  RateLimitError,
} from "../src/lib/errors";
import { completeChat, type ChatMessage } from "../src/lib/llm";

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    llmApiKey: "sk-test",
    llmBaseUrl: "https://llm.example.com/v1/",
    llmModel: "test-model",
    llmTimeoutMs: 5000,
    llmMaxRetries: 2,
    maxCodeLength: 200,
    port: 3000,
    ...overrides,
  };
}

const MESSAGES: ChatMessage[] = [
  { role: "system", content: "You are a reviewer." },
  { role: "user", content: "const a = 1;" },
];

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function okResponse(content: string): Response {
  return jsonResponse(200, {
    choices: [{ message: { content } }],
  });
}

/** Stub fetch and return the calls that were made. */
function stubFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn = mock(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return handler(url, init);
  });
  globalThis.fetch = fn as unknown as typeof fetch;
  return { fn, calls };
}

function parseRequestBody(init: RequestInit): {
  model: string;
  response_format?: { type: string };
  messages: ChatMessage[];
} {
  return JSON.parse(String(init.body)) as {
    model: string;
    response_format?: { type: string };
    messages: ChatMessage[];
  };
}

afterEach(() => {
  // Restore a fetch that fails loudly so stray calls surface in tests.
  globalThis.fetch = mock(async () => {
    throw new Error("fetch should not be called outside stubs");
  }) as unknown as typeof fetch;
});

describe("completeChat basics", () => {
  it("returns the assistant content and sends expected headers/body", async () => {
    const { calls } = stubFetch((_url, init) => {
      const body = parseRequestBody(init);
      expect(body.model).toBe("test-model");
      expect(body.messages).toEqual(MESSAGES);
      expect(body.response_format).toEqual({ type: "json_object" });
      return okResponse('{"score": 5}');
    });

    const content = await completeChat(makeConfig(), MESSAGES);

    expect(content).toBe('{"score": 5}');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://llm.example.com/v1/chat/completions");
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk-test");
  });

  it("omits response_format when responseFormat is false", async () => {
    let seenResponseFormat: unknown = "unset";
    stubFetch((_url, init) => {
      seenResponseFormat = parseRequestBody(init).response_format;
      return okResponse('{"score": 5}');
    });

    await completeChat(makeConfig(), MESSAGES, { responseFormat: false });

    expect(seenResponseFormat).toBeUndefined();
  });
});

describe("response_format fallback", () => {
  it("retries without response_format when the provider rejects it", async () => {
    let first = true;
    const { calls } = stubFetch((_url, init) => {
      if (first) {
        first = false;
        return jsonResponse(400, {
          error: {
            message: "Invalid input",
            type: "invalid_request_error",
            param: "response_format",
            code: "invalid_request_error",
          },
        });
      }
      return okResponse('{"score": 6}');
    });

    const content = await completeChat(makeConfig(), MESSAGES);

    expect(content).toBe('{"score": 6}');
    expect(calls).toHaveLength(2);
    expect(parseRequestBody(calls[0]!.init).response_format).toEqual({
      type: "json_object",
    });
    expect(parseRequestBody(calls[1]!.init).response_format).toBeUndefined();
  });

  it("succeeds on the second call when the provider mentions response_format in a plain message", async () => {
    let first = true;
    stubFetch(() => {
      if (first) {
        first = false;
        return jsonResponse(400, {
          error: {
            message: "Unsupported parameter: 'response_format'",
            type: "invalid_request_error",
            code: "invalid_request_error",
          },
        });
      }
      return okResponse('{"score": 6}');
    });

    const content = await completeChat(makeConfig(), MESSAGES);
    expect(content).toBe('{"score": 6}');
  });

  it("does not fall back for unrelated 400 errors", async () => {
    let calls = 0;
    stubFetch(() => {
      calls += 1;
      return jsonResponse(400, {
        error: {
          message: "Model not found",
          type: "invalid_request_error",
          code: "model_not_found",
        },
      });
    });

    await expect(completeChat(makeConfig(), MESSAGES)).rejects.toThrow(LlmUpstreamError);
    expect(calls).toBe(1);
  });

  it("does not fall back when the error body is unparseable", async () => {
    let calls = 0;
    stubFetch(() => {
      calls += 1;
      return new Response("Bad Gateway", { status: 400 });
    });

    await expect(completeChat(makeConfig(), MESSAGES)).rejects.toThrow(LlmUpstreamError);
    expect(calls).toBe(1);
  });
});

describe("retries and transient failures", () => {
  it("retries 5xx responses with backoff and succeeds", async () => {
    const attempts = [503, 502, 200];
    let idx = 0;
    const { calls } = stubFetch(() => {
      const status = attempts[idx++]!;
      return status === 200 ? okResponse('{"score": 4}') : jsonResponse(status, {});
    });

    const content = await completeChat(makeConfig({ llmMaxRetries: 3 }), MESSAGES);

    expect(content).toBe('{"score": 4}');
    expect(calls).toHaveLength(3);
  });

  it("gives up after exhausting retries", async () => {
    let calls = 0;
    stubFetch(() => {
      calls += 1;
      return jsonResponse(500, { error: { message: "boom" } });
    });

    await expect(
      completeChat(makeConfig({ llmMaxRetries: 2 }), MESSAGES),
    ).rejects.toThrow(/LLM provider error \(500\)/);
    expect(calls).toBe(3);
  });

  it("throws RateLimitError on 429 without retrying", async () => {
    let calls = 0;
    stubFetch(() => {
      calls += 1;
      return jsonResponse(429, { error: { message: "too many" } });
    });

    await expect(completeChat(makeConfig(), MESSAGES)).rejects.toThrow(RateLimitError);
    expect(calls).toBe(1);
  });

  it("throws LlmAuthError on 401", async () => {
    stubFetch(() =>
      jsonResponse(401, { error: { message: "Invalid API key" } }),
    );

    await expect(completeChat(makeConfig(), MESSAGES)).rejects.toThrow(LlmAuthError);
  });

  it("throws LlmTimeoutError when the request is aborted", async () => {
    stubFetch((_url, init) => {
      const signal = init.signal as AbortSignal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    await expect(
      completeChat(makeConfig({ llmTimeoutMs: 20 }), MESSAGES),
    ).rejects.toThrow(LlmTimeoutError);
  });

  it("throws LlmUpstreamError for an empty completion", async () => {
    stubFetch(() => jsonResponse(200, { choices: [{ message: { content: "  " } }] }));

    await expect(completeChat(makeConfig(), MESSAGES)).rejects.toThrow(
      /empty completion/,
    );
  });
});
