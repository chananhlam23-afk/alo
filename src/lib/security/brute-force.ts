import { prisma } from "@/lib/db/prisma";

// ─── Security event logging ───────────────────────────────────────────────────

export interface SecurityEventData {
  type: string;
  ip: string;
  userId?: string;
  path: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

/**
 * Persists a security event to the database.
 * Non-throwing — failures are silently logged to stderr so they never
 * interrupt the request that triggered them.
 */
export async function logSecurityEvent(data: SecurityEventData): Promise<void> {
  try {
    await prisma.securityEvent.create({
      data: {
        type: data.type,
        ip: data.ip,
        userId: data.userId,
        path: data.path,
        userAgent: data.userAgent,
        metadata: (data.metadata ?? {}) as Record<string, string | number | boolean | null>,
        severity: data.severity ?? "LOW",
      },
    });
  } catch (err) {
    console.error("[security] Failed to log security event:", err);
  }
}

// ─── Login attempt tracking ───────────────────────────────────────────────────

/**
 * Records one login attempt (success or failure) in the database.
 */
export async function recordLoginAttempt(
  ip: string,
  email: string,
  success: boolean,
): Promise<void> {
  try {
    await prisma.loginAttempt.create({ data: { ip, email, success } });
  } catch (err) {
    console.error("[security] Failed to record login attempt:", err);
  }
}

// ─── Brute-force detection ────────────────────────────────────────────────────

export interface BruteForceResult {
  blocked: boolean;
  reason?: string;
  retryAfter?: number; // seconds
}

const WINDOW_15_MIN_MS = 15 * 60 * 1000;
const WINDOW_1_HOUR_MS = 60 * 60 * 1000;

/**
 * Checks whether the given IP or email is exhibiting brute-force behaviour.
 *
 * Rules:
 * - IP  > 10 failures in 15 min  → block IP for 30 min
 * - Email > 5 failures in 15 min → block email for 15 min
 * - IP  > 30 failures in 1 hour  → block IP for 2 hours + log CRITICAL event
 *
 * Also auto-inserts/extends an IpBlock record for extreme IP abuse.
 */
export async function checkBruteForce(
  ip: string,
  email: string,
): Promise<BruteForceResult> {
  const now = new Date();
  const window15 = new Date(now.getTime() - WINDOW_15_MIN_MS);
  const window1h = new Date(now.getTime() - WINDOW_1_HOUR_MS);

  // Run all counts in parallel to minimise latency
  const [ipFailures15, emailFailures15, ipFailures1h, existingBlock] =
    await Promise.all([
      prisma.loginAttempt.count({
        where: { ip, success: false, createdAt: { gte: window15 } },
      }),
      prisma.loginAttempt.count({
        where: { email, success: false, createdAt: { gte: window15 } },
      }),
      prisma.loginAttempt.count({
        where: { ip, success: false, createdAt: { gte: window1h } },
      }),
      // Check existing non-expired IpBlock for this IP
      prisma.ipBlock.findFirst({
        where: {
          ip,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
    ]);

  // Already explicitly blocked
  if (existingBlock) {
    const retryAfter = existingBlock.expiresAt
      ? Math.ceil((existingBlock.expiresAt.getTime() - now.getTime()) / 1000)
      : 3600;
    return {
      blocked: true,
      reason: existingBlock.reason,
      retryAfter,
    };
  }

  // Extreme abuse — block IP for 2 hours and create a persisted block
  if (ipFailures1h > 30) {
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    await Promise.all([
      prisma.ipBlock.upsert({
        where: { ip },
        create: { ip, reason: "Brute force: >30 failures/hour", expiresAt },
        update: { reason: "Brute force: >30 failures/hour", expiresAt, blockedAt: now },
      }),
      logSecurityEvent({
        type: "BRUTE_FORCE_EXTREME",
        ip,
        path: "/api/v1/auth/login",
        metadata: { ipFailures1h, email },
        severity: "CRITICAL",
      }),
    ]);
    return {
      blocked: true,
      reason: "Quá nhiều lần đăng nhập thất bại. Thử lại sau 2 giờ.",
      retryAfter: 2 * 60 * 60,
    };
  }

  // IP brute force (moderate) — block for 30 min (in-memory check only, no
  // persistent IpBlock to avoid false-positive lock-outs at this threshold)
  if (ipFailures15 > 10) {
    return {
      blocked: true,
      reason: "Quá nhiều lần đăng nhập thất bại từ IP này. Thử lại sau 30 phút.",
      retryAfter: 30 * 60,
    };
  }

  // Email brute force — could be credential stuffing
  if (emailFailures15 > 5) {
    return {
      blocked: true,
      reason: "Tài khoản bị tạm khóa do đăng nhập sai nhiều lần. Thử lại sau 15 phút.",
      retryAfter: 15 * 60,
    };
  }

  return { blocked: false };
}
