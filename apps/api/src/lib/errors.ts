/** Error types used across the API. */

export class AppError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

/** 400 - invalid request body. */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
    this.name = "ValidationError";
  }
}

/** 401 - LLM API key missing or rejected. */
export class LlmAuthError extends AppError {
  constructor(message: string) {
    super(401, message);
    this.name = "LlmAuthError";
  }
}

/** 429 - provider rate limit. */
export class RateLimitError extends AppError {
  constructor(message: string) {
    super(429, message);
    this.name = "RateLimitError";
  }
}

/** 502 - provider returned an error (5xx) or an invalid response. */
export class LlmUpstreamError extends AppError {
  constructor(message: string) {
    super(502, message);
    this.name = "LlmUpstreamError";
  }
}

/** 504 - LLM request timed out. */
export class LlmTimeoutError extends AppError {
  constructor(message: string) {
    super(504, message);
    this.name = "LlmTimeoutError";
  }
}
