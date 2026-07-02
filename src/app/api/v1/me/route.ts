import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findUserById, findUserByPhone, updateUser } from "@/repositories/user.repository";
import { UpdateProfileSchema } from "@/validators/auth.validator";
import { sanitizePhone, isValidVietnamPhone } from "@/lib/security/sanitize";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const user = await findUserById(auth.payload.userId);
  if (!user) return Errors.notFound("Tài khoản không tồn tại");

  return ok({ user });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const data: Prisma.UserUpdateInput = {};
  if (parsed.data.fullName !== undefined)  data.fullName  = parsed.data.fullName;
  if (parsed.data.avatarUrl !== undefined) data.avatarUrl = parsed.data.avatarUrl;

  // ── Số điện thoại: chuẩn hóa về dạng 0xxxxxxxxx, kiểm tra định dạng VN và
  //    chống trùng (cột phone là @unique) trước khi lưu. ─────────────────────
  if (parsed.data.phone !== undefined) {
    const phone = sanitizePhone(parsed.data.phone);
    if (!isValidVietnamPhone(phone)) {
      return Errors.validation("Số điện thoại không hợp lệ (VD: 0901234567)");
    }
    const existing = await findUserByPhone(phone);
    if (existing && existing.id !== auth.payload.userId) {
      return Errors.validation("Số điện thoại đã được sử dụng bởi tài khoản khác");
    }
    data.phone = phone;
  }

  const user = await updateUser(auth.payload.userId, data);
  return ok({ user });
}
