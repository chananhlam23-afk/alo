import { createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";

const MAX_ATTEMPTS = 5;

export type OtpResult = { ok: true } | { ok: false; reason: string };

/**
 * Xác minh + tiêu thụ (đánh dấu `used`) mã OTP email mới nhất của một email.
 * Dùng chung cho: đăng nhập OTP, xác thực khi đăng ký, và đặt lại mật khẩu.
 * Mã 6 chữ số, sha256-hash, hết hạn 10 phút, tối đa 5 lần thử (khớp email-otp/request).
 */
export async function consumeEmailOtp(email: string, otp: string): Promise<OtpResult> {
  const record = await prisma.emailOtp.findFirst({
    where: { email, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return { ok: false, reason: "OTP không tồn tại hoặc đã hết hạn" };
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "Đã vượt quá số lần thử OTP. Vui lòng yêu cầu mã mới." };
  }

  const codeHash = createHash("sha256").update(otp).digest("hex");
  if (record.codeHash !== codeHash) {
    await prisma.emailOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "Mã OTP không chính xác" };
  }

  await prisma.emailOtp.update({ where: { id: record.id }, data: { used: true } });
  return { ok: true };
}
