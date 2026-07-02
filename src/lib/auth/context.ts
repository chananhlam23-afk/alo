import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "./options";
import { Errors } from "@/lib/api/response";
import { getBearerPayload } from "@/lib/auth/session";
import type { AuthTokenPayload } from "@/types/api";

type AuthResult =
  | { payload: AuthTokenPayload }
  | { error: ReturnType<typeof Errors.unauthorized> };

/**
 * Resolves the caller's identity from EITHER auth scheme:
 *  1. Mobile app → stateless `Authorization: Bearer <accessToken>` (jwt.ts).
 *  2. Web/admin  → NextAuth cookie session.
 * The Bearer path is tried first so the Flutter app (which has no cookie) can
 * reach every requireAuth-protected route, not just the bespoke /auth/* ones.
 */
export async function getAuthContext(req?: NextRequest): Promise<AuthResult> {
  // 1. Bearer access token (mobile app)
  if (req) {
    const bearer = await getBearerPayload(req);
    if (bearer?.userId) {
      return { payload: { userId: bearer.userId, role: bearer.role ?? "CUSTOMER" } };
    }
  }

  // 2. NextAuth cookie session (web dashboard / admin)
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: Errors.unauthorized() };

  return {
    payload: {
      userId: session.user.id,
      role: (session.user as { role?: string }).role ?? "CUSTOMER",
    },
  };
}

export async function requireAuth(
  _req?: NextRequest,
  requiredRole?: string,
): Promise<AuthResult> {
  const result = await getAuthContext(_req);
  if ("error" in result) return result;

  if (requiredRole && result.payload.role !== requiredRole) {
    return { error: Errors.forbidden() };
  }
  return result;
}
