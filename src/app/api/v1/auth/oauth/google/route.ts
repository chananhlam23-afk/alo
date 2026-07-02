import { NextRequest } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import { ok, Errors } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import {
  signAccessToken, signRefreshToken,
  hashToken, refreshTokenExpiresAt,
} from "@/lib/auth/jwt";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
const GOOGLE_ISSUER = "https://accounts.google.com";

const Schema = z.object({
  idToken: z.string().min(10),
  role: z.enum(["CUSTOMER", "DRIVER"]).default("CUSTOMER"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  // Verify Google ID token
  let sub: string, email: string, name: string | undefined, picture: string | undefined;
  let emailVerified: unknown;
  try {
    const { payload } = await jwtVerify(parsed.data.idToken, GOOGLE_JWKS, {
      issuer: [GOOGLE_ISSUER, "accounts.google.com"],
      audience: process.env.GOOGLE_CLIENT_ID!,
    });
    sub           = payload.sub as string;
    email         = payload.email as string;
    emailVerified = (payload as Record<string, unknown>).email_verified;
    name          = payload.name as string | undefined;
    picture       = payload.picture as string | undefined;
  } catch {
    return Errors.unauthorized("Google token không hợp lệ hoặc đã hết hạn");
  }

  if (!email) return Errors.validation("Không lấy được email từ Google");
  // Chặn chiếm tài khoản qua email chưa xác minh (không được link vào tài khoản sẵn có).
  if (emailVerified !== true && emailVerified !== "true") {
    return Errors.unauthorized("Email Google chưa được xác minh");
  }

  // Find or create user
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { accounts: { some: { provider: "google", providerAccountId: sub } } },
        { email },
      ],
    },
    select: { id: true, email: true, phone: true, fullName: true, avatarUrl: true, role: true, isBlocked: true },
  });

  if (user?.isBlocked) return Errors.forbidden("Tài khoản đã bị khóa");

  if (!user) {
    // New user — create with Google provider
    user = await prisma.user.create({
      data: {
        email,
        fullName: name,
        avatarUrl: picture,
        role: parsed.data.role,
        emailVerified: new Date(),
        accounts: {
          create: {
            type:              "oauth",
            provider:          "google",
            providerAccountId: sub,
          },
        },
      },
      select: { id: true, email: true, phone: true, fullName: true, avatarUrl: true, role: true, isBlocked: true },
    });
  } else {
    // Link Google account if not yet linked
    const linked = await prisma.account.findUnique({
      where: { provider_providerAccountId: { provider: "google", providerAccountId: sub } },
    });
    if (!linked) {
      await prisma.account.create({
        data: { userId: user.id, type: "oauth", provider: "google", providerAccountId: sub },
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

  // Issue JWT tokens
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
      fullName:  user.fullName,
      avatarUrl: user.avatarUrl,
      role:      user.role,
      isVerified: true,
    },
  });
}
