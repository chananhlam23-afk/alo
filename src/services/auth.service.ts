import { createHash, randomInt } from "crypto";
import {
  createOtp,
  findUnusedOtp,
  markOtpUsed,
  incrementOtpAttempts,
  findUserByPhone,
  findUserById,
  createUser,
  createRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
} from "@/repositories/user.repository";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  refreshTokenExpiresAt,
} from "@/lib/auth/jwt";
import { sanitizePhone } from "@/lib/security/sanitize";
import { smsProvider } from "@/lib/sms/sms.provider";

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function requestOtp(rawPhone: string) {
  const phone = sanitizePhone(rawPhone);
  const code = String(randomInt(100000, 999999));
  const codeHash = createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  const record = await createOtp({ phone, codeHash, expiresAt });

  await smsProvider.sendOtp(phone, code);

  return { otpId: record.id, expiresIn: OTP_EXPIRY_MS / 1000 };
}

export async function verifyOtp(otpId: string, code: string) {
  const record = await findUnusedOtp(otpId);
  if (!record) throw new Error("OTP không tìm thấy hoặc đã hết hạn");

  if (record.attempts >= MAX_ATTEMPTS) {
    throw new Error("Đã vượt quá số lần thử OTP");
  }

  const codeHash = createHash("sha256").update(code).digest("hex");
  if (record.codeHash !== codeHash) {
    await incrementOtpAttempts(otpId);
    throw new Error("Mã OTP không chính xác");
  }

  await markOtpUsed(otpId);

  let user = await findUserByPhone(record.phone);
  if (!user) {
    user = await createUser({ phone: record.phone });
  }

  if (user.isBlocked) throw new Error("Tài khoản đã bị khóa");

  return issueTokens(user.id, user.role);
}

export async function refreshTokenPair(rawRefreshToken: string) {
  let payload;
  try {
    payload = await verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new Error("Refresh token không hợp lệ");
  }

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await findRefreshToken(tokenHash);
  if (!stored || stored.expiresAt < new Date()) {
    throw new Error("Refresh token đã hết hạn hoặc không tồn tại");
  }

  await deleteRefreshToken(stored.id);

  // Đọc lại user từ DB: chặn tài khoản đã bị khóa lấy lại session, và luôn cấp
  // token theo role hiện tại trong DB (không dùng role cũ trong token).
  const user = await findUserById(payload.userId);
  if (!user || user.isBlocked) throw new Error("Tài khoản đã bị khóa hoặc không tồn tại");

  return issueTokens(user.id, user.role);
}

async function issueTokens(userId: string, role: string) {
  const payload = { userId, role };
  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);
  const tokenHash = hashToken(refreshToken);
  await createRefreshToken({ userId, tokenHash, expiresAt: refreshTokenExpiresAt() });

  return { accessToken, refreshToken };
}
