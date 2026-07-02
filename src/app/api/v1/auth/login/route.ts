import { NextRequest } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { ok, Errors } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getClientIp } from "@/lib/security/ip";
import { checkBruteForce, recordLoginAttempt } from "@/lib/security/brute-force";
import { issueSession } from "@/lib/auth/session";

const LoginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const body = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { email, password } = parsed.data;

  const bruteCheck = await checkBruteForce(ip, email);
  if (bruteCheck.blocked) {
    return Errors.rateLimited(bruteCheck.reason ?? "Quá nhiều yêu cầu, thử lại sau");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Constant-ish failure path: never reveal whether the email exists.
  if (!user || !user.passwordHash || !(await compare(password, user.passwordHash))) {
    await recordLoginAttempt(ip, email, false);
    return Errors.unauthorized("Email hoặc mật khẩu không đúng");
  }
  if (user.isBlocked) return Errors.forbidden("Tài khoản đã bị khóa");

  await recordLoginAttempt(ip, email, true);
  return ok(await issueSession(user));
}
