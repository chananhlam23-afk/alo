import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getBearerPayload } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const payload = await getBearerPayload(req);
  if (!payload) return Errors.unauthorized();

  // Revoke every refresh token for this user (logs out all of their sessions).
  await prisma.refreshToken.deleteMany({ where: { userId: payload.userId } });

  return ok({ message: "Đã đăng xuất" });
}
