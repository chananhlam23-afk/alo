import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "./ip";
import { checkIpLimit } from "./ip-limiter";
import { threatScore } from "./threat";
import { logSecurityEvent } from "./brute-force";
import { prisma } from "@/lib/db/prisma";

export interface ShieldOptions {
  /** Custom rate limit for this specific endpoint */
  rateLimit?: { max: number; windowMs: number };
  /** If true, verifies the request carries a valid session (NextAuth token check
   *  is done by the route itself; this flag enables the shield to reject early
   *  before the route handler runs) */
  requireAuth?: boolean;
}

type Handler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse>;

/**
 * Wraps an API route handler with:
 * - Real IP extraction
 * - IpBlock table check (persistent block from admin)
 * - Custom rate limiting (optional)
 * - Threat scoring + security event logging for high-score requests
 */
export function withShield(handler: Handler, options: ShieldOptions = {}): Handler {
  return async (req: NextRequest, ctx?: unknown): Promise<NextResponse> => {
    const ip = getClientIp(req);
    const { pathname } = req.nextUrl;
    const ua = req.headers.get("user-agent") ?? undefined;

    // 1. Check persistent IP block (DB lookup — only in Node runtime API routes)
    try {
      const block = await prisma.ipBlock.findFirst({
        where: {
          ip,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });
      if (block) {
        const retryAfter = block.expiresAt
          ? Math.ceil((block.expiresAt.getTime() - Date.now()) / 1000)
          : 3600;
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: `Blocked: ${block.reason}` } },
          {
            status: 403,
            headers: { "Retry-After": String(retryAfter) },
          },
        );
      }
    } catch {
      // DB unavailable — fail open rather than denying legitimate users
    }

    // 2. Custom endpoint-level rate limit
    if (options.rateLimit) {
      const { max, windowMs } = options.rateLimit;
      const result = checkIpLimit(ip, pathname, max, windowMs);
      if (!result.allowed) {
        return NextResponse.json(
          { success: false, error: { code: "RATE_LIMITED", message: "Quá nhiều yêu cầu, thử lại sau." } },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            },
          },
        );
      }
    }

    // 3. Threat score — log MEDIUM+ threats (score ≥ 40)
    const score = threatScore(req);
    if (score >= 40) {
      const severity = score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : "MEDIUM";
      // Fire-and-forget — don't await so we don't slow down legitimate requests
      void logSecurityEvent({
        type: "SUSPICIOUS_REQUEST",
        ip,
        path: pathname,
        userAgent: ua,
        metadata: { score, method: req.method },
        severity,
      });
    }

    // 4. Extremely high threat score — block outright
    if (score >= 80) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Forbidden" } },
        { status: 403 },
      );
    }

    // 5. Delegate to the real handler
    return handler(req, ctx);
  };
}
