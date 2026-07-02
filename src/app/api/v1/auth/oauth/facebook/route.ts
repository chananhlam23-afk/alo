import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, Errors } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import {
  signAccessToken, signRefreshToken,
  hashToken, refreshTokenExpiresAt,
} from "@/lib/auth/jwt";

// Facebook không phát hành JWT ký sẵn (như Google/Apple) cho luồng login chuẩn.
// Client gửi lên một ACCESS TOKEN (opaque) → ta phải xác minh qua Graph API:
//   1) /debug_token — đảm bảo token hợp lệ VÀ thuộc đúng app của ta (chống token-substitution)
//   2) /me           — lấy hồ sơ (id, name, email, ảnh đại diện)
const FB_GRAPH = "https://graph.facebook.com/v23.0";

const Schema = z.object({
  accessToken: z.string().min(10),
  role: z.enum(["CUSTOMER", "DRIVER"]).default("CUSTOMER"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) return Errors.internal("Facebook OAuth chưa được cấu hình");

  // ── Verify token với Graph API ──────────────────────────────────────────────
  let sub: string;
  let name: string | undefined;
  let picture: string | undefined;
  try {
    const appToken = `${appId}|${appSecret}`;

    // 1) debug_token — token phải is_valid và app_id phải khớp app của ta
    const debugRes = await fetch(
      `${FB_GRAPH}/debug_token?input_token=${encodeURIComponent(parsed.data.accessToken)}` +
        `&access_token=${encodeURIComponent(appToken)}`,
      { cache: "no-store" },
    );
    const debugJson = await debugRes.json();
    const d = debugJson?.data;
    if (!debugRes.ok || !d?.is_valid || String(d?.app_id) !== String(appId)) {
      return Errors.unauthorized("Facebook token không hợp lệ hoặc đã hết hạn");
    }

    // 2) /me — lấy hồ sơ người dùng
    const meRes = await fetch(
      `${FB_GRAPH}/me?fields=id,name,email,picture.type(large)` +
        `&access_token=${encodeURIComponent(parsed.data.accessToken)}`,
      { cache: "no-store" },
    );
    const me = await meRes.json();
    if (!meRes.ok || !me?.id) {
      return Errors.unauthorized("Facebook token không hợp lệ hoặc đã hết hạn");
    }

    sub = me.id as string;
    name = me.name as string | undefined;
    picture = me?.picture?.data?.url as string | undefined;
  } catch {
    return Errors.unauthorized("Facebook token không hợp lệ hoặc đã hết hạn");
  }

  // Find or create user — CHỈ khớp theo tài khoản Facebook (providerAccountId),
  // KHÔNG khớp theo email: email của Facebook không đảm bảo đã xác minh → tránh
  // chiếm tài khoản người khác qua email trùng.
  let user = await prisma.user.findFirst({
    where: {
      accounts: { some: { provider: "facebook", providerAccountId: sub } },
    },
    select: { id: true, email: true, phone: true, fullName: true, avatarUrl: true, role: true, isBlocked: true },
  });

  if (user?.isBlocked) return Errors.forbidden("Tài khoản đã bị khóa");

  if (!user) {
    // New user — KHÔNG lưu email Facebook (chưa xác minh) để tránh đụng ràng buộc
    // email @unique và tránh dùng email chưa xác minh làm định danh.
    user = await prisma.user.create({
      data: {
        email: null,
        fullName: name ?? null,
        avatarUrl: picture ?? null,
        role: parsed.data.role,
        emailVerified: null,
        accounts: {
          create: {
            type:              "oauth",
            provider:          "facebook",
            providerAccountId: sub,
          },
        },
      },
      select: { id: true, email: true, phone: true, fullName: true, avatarUrl: true, role: true, isBlocked: true },
    });
  } else {
    // Link Facebook account if not yet linked
    const linked = await prisma.account.findUnique({
      where: { provider_providerAccountId: { provider: "facebook", providerAccountId: sub } },
    });
    if (!linked) {
      await prisma.account.create({
        data: { userId: user.id, type: "oauth", provider: "facebook", providerAccountId: sub },
      });
    }
    // Update avatar/name if missing
    if (!user.avatarUrl || !user.fullName) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          avatarUrl: user.avatarUrl ?? picture,
          fullName:  user.fullName  ?? name,
        },
      });
    }
  }

  // ── Issue JWT tokens ────────────────────────────────────────────────────────
  const payload   = { userId: user.id, role: user.role };
  const accessToken  = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: refreshTokenExpiresAt() },
  });

  return ok({
    accessToken,
    refreshToken,
    user: {
      id:        user.id,
      email:     user.email ?? "",
      phone:     user.phone ?? "",
      fullName:  user.fullName ?? name ?? null,
      avatarUrl: user.avatarUrl ?? picture ?? null,
      role:      user.role,
      isVerified: true,
    },
  });
}
