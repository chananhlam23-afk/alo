import { NextResponse } from "next/server";
import type { ApiErrorCode } from "@/types/api";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function err(code: ApiErrorCode, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export const Errors = {
  unauthorized: (msg = "Chưa xác thực") => err("UNAUTHORIZED", msg, 401),
  forbidden: (msg = "Không có quyền truy cập") => err("FORBIDDEN", msg, 403),
  notFound: (msg = "Không tìm thấy") => err("NOT_FOUND", msg, 404),
  validation: (msg: string) => err("VALIDATION", msg, 422),
  conflict: (msg: string) => err("CONFLICT", msg, 409),
  paymentRequired: (msg: string) => err("PAYMENT_REQUIRED", msg, 402),
  kycPending: (msg = "Hồ sơ KYC chưa được duyệt") => err("KYC_PENDING", msg, 403),
  rateLimited: (msg = "Quá nhiều yêu cầu, thử lại sau") => err("RATE_LIMITED", msg, 429),
  internal: (msg = "Lỗi hệ thống") => err("INTERNAL_ERROR", msg, 500),
};
