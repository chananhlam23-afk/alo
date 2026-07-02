import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { ok, Errors } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getClientIp } from "@/lib/security/ip";
import { checkBruteForce, recordLoginAttempt } from "@/lib/security/brute-force";
import { consumeEmailOtp } from "@/lib/auth/email-otp";

const RegisterSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  fullName: z.string().min(2).max(100).optional(),
  role: z.enum(["CUSTOMER", "DRIVER"]).default("CUSTOMER"),
  // Mã OTP email để xác thực. Web luôn gửi kèm (bắt buộc ở UI); để optional nhằm
  // giữ tương thích với client cũ (app mobile dùng luồng email-OTP/social riêng).
  otp: z.string().regex(/^\d{6}$/, "Mã OTP gồm 6 chữ số").optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const body = await req.json().catch(() => null);
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  // Brute-force check — treat register as a login-class action to prevent
  // email enumeration via rapid registration attempts
  const bruteCheck = await checkBruteForce(ip, parsed.data.email);
  if (bruteCheck.blocked) {
    const res = Errors.rateLimited(bruteCheck.reason ?? "Quá nhiều yêu cầu, thử lại sau");
    return res;
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    // Record as a "failed" attempt so repeated probing counts against the limit
    await recordLoginAttempt(ip, parsed.data.email, false);
    return Errors.conflict("Email đã được sử dụng");
  }

  // Xác thực email bằng OTP (nếu client gửi kèm). Web bắt buộc bước này.
  let emailVerified: Date | null = null;
  if (parsed.data.otp) {
    const otpResult = await consumeEmailOtp(parsed.data.email, parsed.data.otp);
    if (!otpResult.ok) {
      await recordLoginAttempt(ip, parsed.data.email, false);
      return Errors.unauthorized(otpResult.reason);
    }
    emailVerified = new Date();
  }

  const passwordHash = await hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      emailVerified,
    },
    select: { id: true, email: true, fullName: true, role: true },
  });

  // Record successful registration
  await recordLoginAttempt(ip, parsed.data.email, true);

  return ok({ user }, 201);
}
