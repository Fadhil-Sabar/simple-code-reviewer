/**
 * Minimal OpenAI-compatible chat completions client.
 *
 * Only the capabilities the reviewer needs are implemented:
 * a single chat call with system + user messages, JSON mode, timeout,
 * and retries on transient provider failures.
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

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function baseDelayMs(attempt: number): number {
  return Math.min(1_000 * 2 ** attempt, 8_000);
}

/**
 * Call the provider's chat completions endpoint.
 * Returns the assistant message content.
 * Throws typed errors for auth, rate limits, timeouts and upstream failures.
 */
export async function completeChat(
  config: AppConfig,
  messages: ChatMessage[],
): Promise<string> {
  const url = `${config.llmBaseUrl.replace(/\/+$/, "")}/chat/completions`;

  const attempts = config.llmMaxRetries + 1;
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
          body: JSON.stringify({
            model: config.llmModel,
            messages,
            temperature: 0.2,
            response_format: { type: "json_object" },
          }),
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

      const body = (await response.json().catch(() => null)) as
        | ChatCompletionResponse
        | null;
      const detail = body?.error?.message ?? response.statusText;

      if (response.status === 429) {
        throw new RateLimitError(
          `LLM rate limit reached (429): ${detail}`,
        );
      }

      if (RETRYABLE_STATUSES.has(response.status) && attempt < attempts - 1) {
        lastError = new LlmUpstreamError(
          `LLM provider returned ${response.status}: ${detail}`,
        );
        await sleep(baseDelayMs(attempt));
        continue;
      }

      if (response.status >= 500) {
        throw new LlmUpstreamError(
          `LLM provider error (${response.status}): ${detail}`,
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
        if (attempt >= attempts - 1) {
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
