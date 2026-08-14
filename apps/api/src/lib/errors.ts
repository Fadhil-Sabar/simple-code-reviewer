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

/** 413 - request exceeds the API's accepted body-size limit. */
export class RequestTooLargeError extends AppError {
  constructor(message = "Request body is too large.") {
    super(413, message);
    this.name = "RequestTooLargeError";
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
  /**
   * Whether this error stems from a transient condition worth retrying
   * (e.g. provider 5xx). Non-retryable by default.
   */
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(502, message);
    this.name = "LlmUpstreamError";
    this.retryable = retryable;
  }
}

/** 504 - LLM request timed out. */
export class LlmTimeoutError extends AppError {
  constructor(message: string) {
    super(504, message);
    this.name = "LlmTimeoutError";
  }
}
