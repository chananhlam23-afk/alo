import { z } from "zod";

export const KYC_DOC_TYPES = [
  "CCCD_FRONT",
  "CCCD_BACK",
  "DRIVER_LICENSE",
  "VEHICLE_REGISTRATION",
  "SELFIE",
] as const;

// Giấy tờ gửi kèm khi nộp hồ sơ: client gửi PATH (do /driver/kyc/upload trả về),
// KHÔNG gửi URL tuỳ ý — server tự ký signed URL khi đọc và kiểm tra path thuộc về caller.
export const KycSubmitDocumentSchema = z.object({
  type: z.enum(KYC_DOC_TYPES),
  path: z.string().min(1).max(300),
});

export const SubmitKycSchema = z.object({
  vehicleType: z.enum(["CAR", "TRUCK", "VAN"]),
  vehiclePlate: z
    .string()
    .min(5)
    .max(20)
    .regex(/^[A-Z0-9\-\.]+$/, "Biển số không hợp lệ"),
  seats: z.number().int().min(1).max(45),
  cccdNumber: z.string().regex(/^\d{12}$/, "CCCD phải 12 chữ số"),
  address: z.string().min(5).max(500),
  allowCargo: z.boolean().default(false),
  cargoCapacityKg: z.number().min(0).max(50000).optional(),
  documents: z.array(KycSubmitDocumentSchema).max(10).optional(),
});

// Legacy: route /driver/kyc/documents (giữ tương thích, client mới không dùng)
export const UploadDocumentSchema = z.object({
  type: z.enum(KYC_DOC_TYPES),
  url: z.string().url(),
});

export const CreateRouteSchema = z.object({
  origin: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().min(1).max(500),
  }),
  dest: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().min(1).max(500),
  }),
  departureTime: z.string().datetime(),
  availableSeats: z.number().int().min(1).max(45),
  maxDetourKm: z.number().min(0).max(50).default(10),
  allowCargo: z.boolean().default(false),
  cargoCapacityKg: z.number().min(0).max(50000).optional(),
});

export const UpdateRouteSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]).optional(),
  maxDetourKm: z.number().min(0).max(50).optional(),
  availableSeats: z.number().int().min(0).optional(),
});

export const AvailabilitySchema = z.object({
  online: z.boolean(),
});

export const UpdateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
});

export const WithdrawalSchema = z.object({
  amount: z.number().int().min(50000),
  bankName: z.string().min(2).max(100),
  bankAccountNo: z.string().min(6).max(30).regex(/^\d+$/),
  bankAccountName: z.string().min(2).max(200),
});

export const EarningsQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  groupBy: z.enum(["day", "week", "month"]).default("day"),
});
