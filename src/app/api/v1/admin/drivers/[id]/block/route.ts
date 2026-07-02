import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { BlockUserSchema } from "@/validators/admin.validator";
import { findDriverById } from "@/repositories/driver.repository";
import { updateUser, deleteAllUserRefreshTokens } from "@/repositories/user.repository";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = BlockUserSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const driver = await findDriverById(params.id);
  if (!driver) return Errors.notFound();

  await updateUser(driver.userId, { isBlocked: true });
  // Thu hồi mọi refresh token để phiên đăng nhập (kể cả trên app) bị vô hiệu ngay.
  await deleteAllUserRefreshTokens(driver.userId);
  return ok({ blocked: true, reason: parsed.data.reason });
}
