import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getClientIp } from "@/lib/security/ip";
import { applySecurityHeaders } from "@/lib/security/headers";
import { checkIpLimit, IP_LIMITS } from "@/lib/security/ip-limiter";
import { isKnownBot, isSuspiciousPath, threatScore } from "@/lib/security/threat";

// ─── In-memory blocked-IP cache ───────────────────────────────────────────────
// We cannot call Prisma from Edge runtime, so blocked IPs are stored here.
// The API route POST /api/v1/admin/security/blocks populates this cache when
// it creates a block (via the shield wrapper running in Node runtime).
// The cache is also seeded lazily from the same endpoint on first request.

interface BlockCacheEntry {
  reason: string;
  expiresAt: number | null; // epoch ms, null = permanent
}

const blockedIpCache = new Map<string, BlockCacheEntry>();
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Loads blocked IPs from the internal API endpoint into the in-memory cache.
 * Runs at most once every 5 minutes (lazy refresh).
 */
async function refreshBlockedIpCache(req: NextRequest): Promise<void> {
  const now = Date.now();
  if (now - cacheLoadedAt < CACHE_TTL_MS) return;

  try {
    const url = new URL("/api/v1/security/blocked-ips", req.url);
    const res = await fetch(url.toString(), {
      headers: { "x-internal-key": process.env.INTERNAL_API_KEY ?? "" },
      // Short timeout so we never stall the request more than 300 ms
      signal: AbortSignal.timeout(300),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        blocks: Array<{ ip: string; reason: string; expiresAt: string | null }>;
      };
      blockedIpCache.clear();
      for (const b of data.blocks) {
        blockedIpCache.set(b.ip, {
          reason: b.reason,
          expiresAt: b.expiresAt ? new Date(b.expiresAt).getTime() : null,
        });
      }
      cacheLoadedAt = now;
    }
  } catch {
    // Fail open — never block requests due to a cache refresh failure
  }
}

/**
 * Returns the block entry for an IP if it is currently blocked, otherwise null.
 */
function getBlockEntry(ip: string): BlockCacheEntry | null {
  const entry = blockedIpCache.get(ip);
  if (!entry) return null;
  // Expired block — remove from cache
  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    blockedIpCache.delete(ip);
    return null;
  }
  return entry;
}

// ─── Helper responses ─────────────────────────────────────────────────────────

function blockedResponse(reason: string, status: 403 | 429): NextResponse {
  const res = NextResponse.json(
    { success: false, error: { code: status === 429 ? "RATE_LIMITED" : "FORBIDDEN", message: reason } },
    { status },
  );
  return applySecurityHeaders(res);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? "";

  // 1. Block known scanners / malicious bots
  if (isKnownBot(ua)) {
    return blockedResponse("Forbidden", 403);
  }

  // 2. Block suspicious paths (scanners probing for PHP/WP/dotenv etc.)
  if (isSuspiciousPath(pathname)) {
    return blockedResponse("Forbidden", 403);
  }

  // 2b. Chấm điểm mối đe doạ — bắt cả SQLi/XSS/path-traversal trong QUERY STRING
  //     (Prisma đã chống SQLi ở tầng DB; đây là lớp chặn sớm, giảm tải cho route/DB).
  if (threatScore(req) >= 80) {
    return blockedResponse("Forbidden", 403);
  }

  // 3. Refresh blocked-IP cache (lazy, max once per 5 min) and check IP block
  await refreshBlockedIpCache(req);
  const block = getBlockEntry(ip);
  if (block) {
    return blockedResponse(`Blocked: ${block.reason}`, 403);
  }

  // 4. IP-based rate limiting — CHỈ áp khi chạy production (web thật), chống spam.
  //    Localhost (`next dev`) → NODE_ENV='development' → BỎ QUA (test thoải mái, không 429 giả).
  //    Deploy/build → NODE_ENV='production' → BẬT. NODE_ENV do Next tự đặt, không cấu hình tay,
  //    không client nào spoof được (an toàn hơn dựa vào APP_ENV).
  if (process.env.NODE_ENV === "production") {
    if (pathname.startsWith("/api/v1/auth/")) {
      const result = checkIpLimit(ip, "login", IP_LIMITS.login.max, IP_LIMITS.login.windowMs);
      if (!result.allowed) {
        const res = blockedResponse("Quá nhiều yêu cầu xác thực, thử lại sau.", 429);
        res.headers.set("Retry-After", String(Math.ceil((result.resetAt - Date.now()) / 1000)));
        return res;
      }
    } else if (pathname === "/api/v1/customer/trip-requests" && req.method === "POST") {
      // Chỉ giới hạn khi TẠO đơn (POST). Xem danh sách (GET) KHÔNG tính là "đặt xe".
      const result = checkIpLimit(ip, "booking", IP_LIMITS.booking.max, IP_LIMITS.booking.windowMs);
      if (!result.allowed) {
        const res = blockedResponse("Quá nhiều yêu cầu đặt xe, thử lại sau.", 429);
        res.headers.set("Retry-After", String(Math.ceil((result.resetAt - Date.now()) / 1000)));
        return res;
      }
    } else if (pathname.startsWith("/api/")) {
      const result = checkIpLimit(ip, "api", IP_LIMITS.api.max, IP_LIMITS.api.windowMs);
      if (!result.allowed) {
        const res = blockedResponse("Quá nhiều yêu cầu API, thử lại sau.", 429);
        res.headers.set("Retry-After", String(Math.ceil((result.resetAt - Date.now()) / 1000)));
        return res;
      }
    } else {
      // Trang (không phải /api): trần chống flood theo IP
      const result = checkIpLimit(ip, "page", IP_LIMITS.page.max, IP_LIMITS.page.windowMs);
      if (!result.allowed) {
        const res = blockedResponse("Quá nhiều yêu cầu, thử lại sau.", 429);
        res.headers.set("Retry-After", String(Math.ceil((result.resetAt - Date.now()) / 1000)));
        return res;
      }
    }
  }

  // 5. Auth routing (original logic — unchanged)

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // /admin/* chỉ dành cho ADMIN
  if (pathname.startsWith("/admin")) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(url);
      return applySecurityHeaders(res);
    }
    if (token.role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/customer";
      const res = NextResponse.redirect(url);
      return applySecurityHeaders(res);
    }
  }

  // /driver/* chỉ dành cho người đã đăng nhập
  if (pathname.startsWith("/driver")) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(url);
      return applySecurityHeaders(res);
    }
  }

  // /customer/* chỉ dành cho người đã đăng nhập
  if (pathname.startsWith("/customer")) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      const res = NextResponse.redirect(url);
      return applySecurityHeaders(res);
    }
  }

  // Root redirect dựa trên role
  if (pathname === "/") {
    if (!token) {
      const res = NextResponse.redirect(new URL("/login", req.url));
      return applySecurityHeaders(res);
    }
    if (token.role === "ADMIN") {
      const res = NextResponse.redirect(new URL("/admin", req.url));
      return applySecurityHeaders(res);
    }
    if (token.role === "DRIVER") {
      const res = NextResponse.redirect(new URL("/driver", req.url));
      return applySecurityHeaders(res);
    }
    const res = NextResponse.redirect(new URL("/customer", req.url));
    return applySecurityHeaders(res);
  }

  // 6. Apply security headers to every pass-through response
  const res = NextResponse.next();
  return applySecurityHeaders(res);
}

export const config = {
  matcher: [
    // Auth-protected pages
    "/",
    "/admin/:path*",
    "/driver/:path*",
    "/customer/:path*",
    // All API routes (for rate limiting + bot blocking)
    "/api/:path*",
  ],
};
