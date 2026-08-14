import { RateLimitError } from "./errors";

export interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
  maxConcurrent: number;
}

/**
 * In-process protection against accidental or opportunistic spend abuse.
 * Deployments with multiple instances must also enforce these limits at their
 * edge proxy or WAF.
 */
export class ReviewRateLimiter {
  private readonly requests = new Map<string, number[]>();
  private inFlight = 0;
  private readonly options: RateLimiterOptions;

  constructor(options: RateLimiterOptions) {
    this.options = options;
  }

  acquire(clientId: string, now = Date.now()): () => void {
    const windowStart = now - this.options.windowMs;
    const recent = (this.requests.get(clientId) ?? []).filter((time) => time > windowStart);

    if (recent.length >= this.options.maxRequests) {
      throw new RateLimitError("Too many review requests. Please try again shortly.");
    }
    if (this.inFlight >= this.options.maxConcurrent) {
      throw new RateLimitError("Review capacity is temporarily full. Please try again shortly.");
    }

    recent.push(now);
    this.requests.set(clientId, recent);
    this.inFlight += 1;

    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.inFlight -= 1;
      }
    };
  }
}

/** Use the first address supplied by a trusted reverse proxy, if present. */
export function requestClientId(headers: Headers): string {
  return headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
}
