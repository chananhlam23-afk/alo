import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  signAccessToken,
  signRefreshToken,
  hashToken,
  refreshTokenExpiresAt,
  verifyAccessToken,
} from "@/lib/auth/jwt";

/**
 * Mobile-app JWT session helpers.
 *
 * The web/admin side authenticates via NextAuth cookie sessions (see context.ts),
 * but the Flutter app uses stateless Bearer access tokens signed by jwt.ts. These
 * helpers issue and read that token pair, and shape the user payload exactly the way
 * the app's `AuthTokens.fromJson` / `UserProfile.fromJson` expect (phone/email are
 * non-null strings; `isVerified` is derived from `emailVerified`).
 */

type AppUser = {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  emailVerified?: Date | null;
};

/** Shape a User row into the JSON the app's UserProfile.fromJson expects. */
export function serializeUser(u: AppUser) {
  return {
    id: u.id,
    email: u.email ?? "",
    phone: u.phone ?? "",
    fullName: u.fullName,
    avatarUrl: u.avatarUrl,
    role: u.role,
    isVerified: u.emailVerified != null,
  };
}

/** Sign an access/refresh pair, persist the refresh hash, and return the
 *  `{ accessToken, refreshToken, user }` envelope the app consumes. */
export async function issueSession(u: AppUser) {
  const payload = { userId: u.id, role: u.role };
  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);
  await prisma.refreshToken.create({
    data: { userId: u.id, tokenHash: hashToken(refreshToken), expiresAt: refreshTokenExpiresAt() },
  });
  return { accessToken, refreshToken, user: serializeUser(u) };
}

/** Verify the `Authorization: Bearer <accessToken>` header. Returns the token
 *  payload, or null when missing/invalid (caller decides the error response). */
export async function getBearerPayload(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  try {
    return await verifyAccessToken(header.slice(7));
  } catch {
    return null;
  }
}
