const RATE_LIMIT_WINDOWS: Record<string, { count: number; reset: number }> = {};

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
};

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const existing = RATE_LIMIT_WINDOWS[key];

  if (!existing || now > existing.reset) {
    RATE_LIMIT_WINDOWS[key] = { count: 1, reset: now + config.windowMs };
    return { allowed: true, remaining: config.maxRequests - 1, reset: now + config.windowMs };
  }

  if (existing.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, reset: existing.reset };
  }

  existing.count += 1;
  return { allowed: true, remaining: config.maxRequests - existing.count, reset: existing.reset };
}
