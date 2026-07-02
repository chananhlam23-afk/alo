import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { ok, Errors } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { consumeEmailOtp } from "@/lib/auth/email-otp";

// Đặt lại mật khẩu: người dùng đã nhận mã OTP qua email (email-otp/request),
// nhập mã + mật khẩu mới ở đây. Xác minh mã rồi cập nhật passwordHash.
const Schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  otp: z.string().regex(/^\d{6}$/, "Mã OTP gồm 6 chữ số"),
  newPassword: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { email, otp, newPassword } = parsed.data;

  // Xác minh + tiêu thụ OTP
  const result = await consumeEmailOtp(email, otp);
  if (!result.ok) return Errors.unauthorized(result.reason);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return Errors.notFound("Không tìm thấy tài khoản với email này");
  if (user.isBlocked) return Errors.forbidden("Tài khoản đã bị khóa");

  const passwordHash = await hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      // Đặt lại mật khẩu thành công cũng đồng nghĩa email đã được xác minh
      emailVerified: user.emailVerified ?? new Date(),
    },
  });

  return ok({ message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới." });
}
