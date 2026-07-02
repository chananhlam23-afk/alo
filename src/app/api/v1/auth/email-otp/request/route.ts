import { NextRequest } from "next/server";
import { createHash, randomInt } from "crypto";
import { Resend } from "resend";
import { z } from "zod";
import { ok, Errors } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";

const resend = new Resend(process.env.RESEND_API_KEY!);
const OTP_TTL_MS = 10 * 60 * 1000; // 10 phút
const MAX_PER_HOUR = 5;

const Schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  purpose: z.enum(["login", "register", "reset"]).optional(),
});

const PURPOSE_TEXT: Record<string, string> = {
  login:    "Mã xác thực đăng nhập của bạn:",
  register: "Mã xác thực đăng ký tài khoản của bạn:",
  reset:    "Mã xác thực đặt lại mật khẩu của bạn:",
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { email, purpose } = parsed.data;
  const introText = PURPOSE_TEXT[purpose ?? "login"];

  // Rate limit: 5 lần / giờ
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.emailOtp.count({
    where: { email, createdAt: { gte: since } },
  });
  if (recent >= MAX_PER_HOUR) return Errors.rateLimited("Quá nhiều yêu cầu OTP. Thử lại sau 1 giờ.");

  const code = String(randomInt(100000, 999999));
  const codeHash = createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.emailOtp.create({ data: { email, codeHash, expiresAt } });

  // DEV: in OTP ra console để test mà không cần nhận email thật.
  const isDev = process.env.APP_ENV !== "production";
  if (isDev) {
    console.info(`\n[EMAIL OTP] ${email} → ${code}  (hiệu lực 10 phút)\n`);
  }

  // Resend KHÔNG throw khi API lỗi (domain chưa verify, recipient bị chặn…) —
  // nó trả { data, error }. Phải kiểm tra `error`, nếu không lỗi sẽ vô hình
  // và UI báo "đã gửi" trong khi email thực tế không tới.
  let emailSent = false;
  let sendError: string | null = null;
  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Thuận Chuyến <no-reply@thuanchuyen.com>",
      to: email,
      subject: `${code} là mã OTP của bạn - Thuận Chuyến`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px">
          <div style="background:#fff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
            <h2 style="color:#2563eb;margin:0 0 8px">🚌 Thuận Chuyến</h2>
            <p style="color:#4b5563;margin:0 0 24px">${introText}</p>
            <div style="background:#eff6ff;border:2px dashed #93c5fd;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px">
              <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#1d4ed8">${code}</span>
            </div>
            <p style="color:#9ca3af;font-size:13px;margin:0">Mã có hiệu lực trong <strong>10 phút</strong>. Không chia sẻ mã này với bất kỳ ai.</p>
          </div>
        </div>
      `,
    });
    if (error) {
      sendError = error.message;
      console.error(`[EMAIL OTP] Resend từ chối gửi: ${error.message}`);
    } else {
      emailSent = true;
    }
  } catch (e) {
    sendError = (e as Error).message;
    console.error(`[EMAIL OTP] Lỗi mạng khi gửi email: ${sendError}`);
  }

  // PRODUCTION: email thất bại thật → báo lỗi rõ (không báo thành công giả).
  if (!emailSent && !isDev) {
    return Errors.internal("Không thể gửi email OTP. Vui lòng thử lại sau.");
  }

  // DEV: chỉ lộ mã (devOtp) khi email GỬI THẤT BẠI — làm phao cứu hộ để vẫn test được.
  // Khi email gửi thành công thì hành xử như production: người dùng phải mở hộp thư lấy mã,
  // KHÔNG hiển thị/tự điền mã trên màn hình.
  return ok({
    message: emailSent ? "OTP đã gửi tới email của bạn" : "OTP đã tạo (email chưa gửi được — xem mã bên dưới)",
    email,
    ...(isDev ? { emailSent, ...(sendError ? { sendError } : {}) } : {}),
    ...(isDev && !emailSent ? { devOtp: code } : {}),
  });
}
