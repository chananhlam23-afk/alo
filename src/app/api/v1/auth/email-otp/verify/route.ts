import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, Errors } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { issueSession } from "@/lib/auth/session";
import { consumeEmailOtp } from "@/lib/auth/email-otp";

// Mirrors auth/email-otp/request: codes are 6 digits, sha256-hashed, 10-min TTL.
const Schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  otp: z.string().regex(/^\d{6}$/, "Mã OTP gồm 6 chữ số"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { email, otp } = parsed.data;

  const result = await consumeEmailOtp(email, otp);
  if (!result.ok) return Errors.unauthorized(result.reason);

  // Email-OTP doubles as sign-up: create the account on first verified login.
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, emailVerified: new Date() } });
  } else {
    if (user.isBlocked) return Errors.forbidden("Tài khoản đã bị khóa");
    if (!user.emailVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }
  }

  return ok(await issueSession(user));
}
