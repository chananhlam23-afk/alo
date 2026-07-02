/**
 * IP-based sliding window rate limiter.
 *
 * Pure in-memory implementation — safe for Edge runtime (no Prisma, no Node
 * built-ins). State resets on cold start; for distributed persistence use
 * Upstash Redis via rate-limit.ts instead.
 */

interface WindowEntry {
  count: number;
  resetAt: number; // epoch ms
}

// key = `${ip}:${limitKey}` → sliding window entry
const ipWindows = new Map<string, WindowEntry>();

// Lazy cleanup runs at most once every 5 minutes
let lastCleanup = 0;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
// Trần số bản ghi — chống cạn RAM khi bị flood bằng IP giả (chính map này có thể
// trở thành vector DoS nếu không giới hạn).
const MAX_ENTRIES = 50_000;

function maybeCleanup(): void {
  const now = Date.now();
  const overCapacity = ipWindows.size > MAX_ENTRIES;
  // Dọn ngay khi quá tải, không chờ đủ 5 phút.
  if (!overCapacity && now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of ipWindows.entries()) {
    if (now > entry.resetAt) {
      ipWindows.delete(key);
    }
  }
  // Vẫn quá tải sau khi dọn (flood IP giả) → xoá sạch để tránh OOM.
  // Chấp nhận reset cửa sổ rate-limit, vẫn tốt hơn là sập tiến trình.
  if (ipWindows.size > MAX_ENTRIES) {
    ipWindows.clear();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms
}

/**
 * Check (and update) the rate limit for a given IP + key combination.
 *
 * @param ip          - Client IP string
 * @param key         - Logical bucket, e.g. "login", "otp", "api"
 * @param maxRequests - Maximum allowed requests in the window
 * @param windowMs    - Window size in milliseconds
 */
export function checkIpLimit(
  ip: string,
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  maybeCleanup();

  const mapKey = `${ip}:${key}`;
  const now = Date.now();
  const existing = ipWindows.get(mapKey);

  if (!existing || now > existing.resetAt) {
    // New window
    ipWindows.set(mapKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  existing.count += 1;

  if (existing.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

// ─── Preset limit configurations ─────────────────────────────────────────────

export interface LimitConfig {
  max: number;
  windowMs: number;
}

export const IP_LIMITS = {
  /** 10 login attempts per 15 minutes per IP */
  login: { max: 10, windowMs: 15 * 60 * 1000 } satisfies LimitConfig,
  /** 5 OTP requests per hour per IP */
  otp: { max: 5, windowMs: 60 * 60 * 1000 } satisfies LimitConfig,
  /** 300 API requests per minute per IP */
  api: { max: 300, windowMs: 60 * 1000 } satisfies LimitConfig,
  /** 20 booking requests per 10 minutes per IP */
  booking: { max: 20, windowMs: 10 * 60 * 1000 } satisfies LimitConfig,
  /** 120 page loads per minute per IP — trần chống flood cho các trang (không phải /api) */
  page: { max: 120, windowMs: 60 * 1000 } satisfies LimitConfig,
} as const;
