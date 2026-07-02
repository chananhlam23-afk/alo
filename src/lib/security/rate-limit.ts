import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// In-memory fallback when Redis not configured (dev/test environment)
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

function makeMemoryLimiter(maxRequests: number, windowMs: number) {
  return {
    limit: async (identifier: string) => {
      const now = Date.now();
      const entry = inMemoryStore.get(identifier);
      if (!entry || now > entry.resetAt) {
        inMemoryStore.set(identifier, { count: 1, resetAt: now + windowMs });
        return { success: true, reset: now + windowMs };
      }
      entry.count++;
      if (entry.count > maxRequests) {
        return { success: false, reset: entry.resetAt };
      }
      return { success: true, reset: entry.resetAt };
    },
  };
}

// Chỉ coi là "có Redis" khi URL/token là THẬT (không phải placeholder trong .env mẫu),
// nếu không sẽ fetch tới host không tồn tại (your-id.upstash.io) → ENOTFOUND → 500.
const _redisUrl   = process.env.UPSTASH_REDIS_REST_URL ?? "";
const _redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
const hasRedis =
  _redisUrl.startsWith("https://") &&
  !_redisUrl.includes("your-id") &&
  _redisToken.length > 0 &&
  !_redisToken.startsWith("your-");

let _redis: Redis | null = null;
function getRedis() {
  if (!_redis && hasRedis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis!;
}

type RateLimiterLike = { limit: (id: string) => Promise<{ success: boolean; reset: number }> };

export const otpRateLimit: RateLimiterLike = hasRedis
  ? new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(5, "1 h"), prefix: "rl:otp" })
  : makeMemoryLimiter(5, 60 * 60 * 1000);

export const apiRateLimit: RateLimiterLike = hasRedis
  ? new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(100, "1 m"), prefix: "rl:api" })
  : makeMemoryLimiter(100, 60 * 1000);

export const matchingRateLimit: RateLimiterLike = hasRedis
  ? new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(30, "1 m"), prefix: "rl:match" })
  : makeMemoryLimiter(30, 60 * 1000);

// Upload ảnh tốn kém hơn API thường (ghi storage) → siết chặt: 20 lần / 5 phút / user.
// Không phụ thuộc NODE_ENV (dùng fallback in-memory ở dev) để luôn chặn spam.
export const uploadRateLimit: RateLimiterLike = hasRedis
  ? new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(20, "5 m"), prefix: "rl:upload" })
  : makeMemoryLimiter(20, 5 * 60 * 1000);

export async function checkRateLimit(
  limiter: RateLimiterLike,
  identifier: string,
): Promise<{ limited: boolean; reset: number }> {
  try {
    const result = await limiter.limit(identifier);
    return { limited: !result.success, reset: result.reset };
  } catch (e) {
    // Redis/limiter gặp sự cố → fail-open (cho qua) để không làm sập tính năng.
    console.error("[rate-limit] limiter error, failing open:", e);
    return { limited: false, reset: Date.now() };
  }
}
