import { NextRequest } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import { ok, Errors } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import {
  signAccessToken, signRefreshToken,
  hashToken, refreshTokenExpiresAt,
} from "@/lib/auth/jwt";

const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

const Schema = z.object({
  identityToken: z.string().min(10),
  fullName: z.string().max(100).optional().nullable(),
  role: z.enum(["CUSTOMER", "DRIVER"]).default("CUSTOMER"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  // Verify Apple identity token
  let sub: string, email: string | undefined;
  let emailIsVerified = false;
  try {
    const { payload } = await jwtVerify(parsed.data.identityToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience: process.env.APPLE_CLIENT_ID!,
    });
    sub   = payload.sub as string;
    email = payload.email as string | undefined;
    const ev = (payload as Record<string, unknown>).email_verified;
    emailIsVerified = ev === true || ev === "true";
  } catch {
    return Errors.unauthorized("Apple token không hợp lệ hoặc đã hết hạn");
  }

  // Chỉ khớp/link theo email khi email đã được xác minh (chống chiếm tài khoản).
  const matchEmail = email && emailIsVerified;

  // Find or create user
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { accounts: { some: { provider: "apple", providerAccountId: sub } } },
        ...(matchEmail ? [{ email }] : []),
      ],
    },
    select: { id: true, email: true, phone: true, fullName: true, avatarUrl: true, role: true, isBlocked: true },
  });

  if (user?.isBlocked) return Errors.forbidden("Tài khoản đã bị khóa");

  if (!user) {
    user = await prisma.user.create({
      data: {
        email:     email ?? null,
        fullName:  parsed.data.fullName ?? null,
        role:      parsed.data.role,
        emailVerified: matchEmail ? new Date() : null,
        accounts: {
          create: {
            type:              "oauth",
            provider:          "apple",
            providerAccountId: sub,
          },
        },
      },
      select: { id: true, email: true, phone: true, fullName: true, avatarUrl: true, role: true, isBlocked: true },
    });
  } else {
    const linked = await prisma.account.findUnique({
      where: { provider_providerAccountId: { provider: "apple", providerAccountId: sub } },
    });
    if (!linked) {
      await prisma.account.create({
        data: { userId: user.id, type: "oauth", provider: "apple", providerAccountId: sub },
      });
    }
    if (!user.fullName && parsed.data.fullName) {
      await prisma.user.update({
        where: { id: user.id },
        data: { fullName: parsed.data.fullName },
      });
    }
  }

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
      fullName:  user.fullName ?? parsed.data.fullName,
      avatarUrl: null,
      role:      user.role,
      isVerified: true,
    },
  });
}
