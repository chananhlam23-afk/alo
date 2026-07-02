import { z } from "zod";

export const RequestOtpSchema = z.object({
  phone: z
    .string()
    .min(9)
    .max(15)
    .regex(/^[0-9+]+$/, "Số điện thoại không hợp lệ"),
});

export const VerifyOtpSchema = z.object({
  otpId: z.string().cuid(),
  code: z.string().length(6).regex(/^\d{6}$/),
});

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  // Số điện thoại được chuẩn hóa + kiểm tra định dạng VN ở tầng route (dùng
  // sanitizePhone/isValidVietnamPhone), nên ở đây chỉ ràng buộc lỏng.
  phone: z.string().trim().min(9).max(15).optional(),
});

export const SwitchRoleSchema = z.object({
  role: z.enum(["CUSTOMER", "DRIVER"]),
});

export const RegisterDeviceSchema = z.object({
  fcmToken: z.string().min(1).max(500),
  platform: z.enum(["android", "ios", "web"]),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
