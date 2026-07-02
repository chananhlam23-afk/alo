import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getBearerPayload, serializeUser } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const payload = await getBearerPayload(req);
  if (!payload) return Errors.unauthorized();

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return Errors.notFound("Người dùng không tồn tại");
  if (user.isBlocked) return Errors.forbidden("Tài khoản đã bị khóa");

  return ok(serializeUser(user));
}
