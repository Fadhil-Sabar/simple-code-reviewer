/**
 * Minimal OpenAI-compatible chat completions client.
 *
 * Only the capabilities the reviewer needs are implemented:
 * a single chat call with system + user messages, optional JSON mode,
 * timeout, and retries on transient provider failures.
 *
 * Some OpenAI-compatible endpoints do not support `response_format`.
 * When a provider rejects it with a 400 invalid-request error, the client
 * automatically retries once without it (the strict parser in review.ts
 * still enforces JSON output).
 */

import type { AppConfig } from "./config";
import {
  LlmAuthError,
  LlmTimeoutError,
  LlmUpstreamError,
  RateLimitError,
} from "./errors";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface CompleteChatOptions {
  /**
   * Ask the provider for JSON output via `response_format`.
   * Defaults to `true`. When the provider rejects it, the request is
   * retried without the parameter.
   */
  responseFormat?: boolean;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
    param?: string;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function baseDelayMs(attempt: number): number {
  return Math.min(1_000 * 2 ** attempt, 8_000);
}

function isUnsupportedResponseFormat(body: ChatCompletionResponse | null): boolean {
  if (!body?.error) {
    return false;
  }
  const { message = "", param, type = "", code = "" } = body.error;
  if (param === "response_format") {
    return true;
  }
  const text = `${message} ${type} ${code}`;
  return /response_format|response format|json_object/i.test(text);
}

function buildBody(
  config: AppConfig,
  messages: ChatMessage[],
  useResponseFormat: boolean,
): string {
  return JSON.stringify({
    model: config.llmModel,
    messages,
    temperature: 0.2,
    ...(useResponseFormat ? { response_format: { type: "json_object" } } : {}),
  });
}

async function parseErrorBody(response: Response): Promise<ChatCompletionResponse | null> {
  try {
    const body = (await response.json()) as ChatCompletionResponse;
    return body ?? null;
  } catch {
    return null;
  }
}

/**
 * Call the provider's chat completions endpoint.
 * Returns the assistant message content.
 * Throws typed errors for auth, rate limits, timeouts and upstream failures.
 */
export async function completeChat(
  config: AppConfig,
  messages: ChatMessage[],
  options: CompleteChatOptions = {},
): Promise<string> {
  const url = `${config.llmBaseUrl.replace(/\/+$/, "")}/chat/completions`;

  const attempts = config.llmMaxRetries + 1;
  let useResponseFormat = options.responseFormat ?? true;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.llmTimeoutMs);

      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.llmApiKey}`,
          },
          body: buildBody(config, messages, useResponseFormat),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (response.ok) {
        const data = (await response.json()) as ChatCompletionResponse;
        const content = data.choices?.[0]?.message?.content;
        if (content === undefined || content.trim() === "") {
          throw new LlmUpstreamError("LLM returned an empty completion.");
        }
        return content;
      }

      if (response.status === 401 || response.status === 403) {
        throw new LlmAuthError(
          "LLM API key is missing or was rejected by the provider.",
        );
      }

      const body = await parseErrorBody(response);
      const detail = body?.error?.message ?? response.statusText;

      // Provider does not support `response_format`: retry once without it.
      if (response.status === 400 && useResponseFormat) {
        if (isUnsupportedResponseFormat(body)) {
          if (attempt >= attempts - 1) {
            throw new LlmUpstreamError(
              `LLM provider does not support response_format: ${detail}`,
            );
          }
          useResponseFormat = false;
          lastError = new LlmUpstreamError(
            `LLM provider does not support response_format; retrying without it (400): ${detail}`,
          );
          continue;
        }
        throw new LlmUpstreamError(
          `Unexpected LLM provider response (400): ${detail}`,
        );
      }

      if (response.status === 429) {
        throw new RateLimitError(
          `LLM rate limit reached (429): ${detail}`,
        );
      }

      if (response.status >= 500) {
        throw new LlmUpstreamError(
          `LLM provider error (${response.status}): ${detail}`,
          true,
        );
      }

      throw new LlmUpstreamError(
        `Unexpected LLM provider response (${response.status}): ${detail}`,
      );
    } catch (err) {
      if (err instanceof LlmAuthError || err instanceof RateLimitError) {
        throw err;
      }
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new LlmTimeoutError(
          `LLM request timed out after ${config.llmTimeoutMs}ms.`,
        );
      }
      if (err instanceof LlmUpstreamError) {
        if (!err.retryable || attempt >= attempts - 1) {
          throw err;
        }
        lastError = err;
        await sleep(baseDelayMs(attempt));
        continue;
      }
      throw err;
    }
  }

  throw (
    lastError ??
    new LlmUpstreamError("LLM request failed after all retry attempts.")
  );
}
