/**
 * Runtime configuration loaded from environment variables.
 *
 * All LLM credentials live only on the backend (see PRD section 10).
 */

export interface AppConfig {
  /** API key for the OpenAI-compatible provider. */
  llmApiKey: string;
  /** Base URL of the OpenAI-compatible endpoint, e.g. https://api.openai.com/v1 */
  llmBaseUrl: string;
  /** Model name used for reviews. */
  llmModel: string;
  /** Timeout in ms for a single LLM request. */
  llmTimeoutMs: number;
  /** Max retries on transient LLM failures (5xx / rate limits). */
  llmMaxRetries: number;
  /** Max accepted code snippet length in characters. */
  maxCodeLength: number;
  /** HTTP port the server listens on. */
  port: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_MAX_CODE_LENGTH = 20_000;
const DEFAULT_PORT = 3000;

/** Thrown when required configuration is missing. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function readInt(env: NodeJS.ProcessEnv, name: string, defaultValue: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") {
    return defaultValue;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new ConfigError(`Invalid ${name}: expected a positive integer, got "${raw}"`);
  }
  return value;
}

function readRequired(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new ConfigError(
      `Missing ${name}. Set it in apps/api/.env (see .env.example).`,
    );
  }
  return value;
}

/**
 * Build config from the current environment.
 * Throws {@link ConfigError} when required LLM settings are absent.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    llmApiKey: readRequired(env, "LLM_API_KEY"),
    llmBaseUrl: readRequired(env, "LLM_BASE_URL"),
    llmModel: readRequired(env, "LLM_MODEL"),
    llmTimeoutMs: readInt(env, "LLM_TIMEOUT_MS", DEFAULT_TIMEOUT_MS),
    llmMaxRetries: readInt(env, "LLM_MAX_RETRIES", DEFAULT_MAX_RETRIES),
    maxCodeLength: readInt(env, "MAX_CODE_LENGTH", DEFAULT_MAX_CODE_LENGTH),
    port: readInt(env, "PORT", DEFAULT_PORT),
  };
}
