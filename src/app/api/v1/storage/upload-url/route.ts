import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { kycUploadUrl, avatarUploadUrl } from "@/lib/supabase/storage";
import { z } from "zod";

const Schema = z.object({
  type: z.enum(["kyc", "avatar"]),
  docType: z.string().optional(),
  driverProfileId: z.string().cuid().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  if (parsed.data.type === "kyc") {
    if (!parsed.data.driverProfileId || !parsed.data.docType) {
      return Errors.validation("driverProfileId và docType là bắt buộc cho KYC upload");
    }
    // Chống IDOR: chỉ cho phép tạo URL upload vào hồ sơ KYC của chính người dùng.
    const driver = await findDriverByUserId(auth.payload.userId);
    if (!driver || driver.id !== parsed.data.driverProfileId) {
      return Errors.forbidden("Không có quyền upload tài liệu cho hồ sơ tài xế này");
    }
    const result = await kycUploadUrl(parsed.data.driverProfileId, parsed.data.docType);
    return ok(result);
  }

  const result = await avatarUploadUrl(auth.payload.userId);
  return ok(result);
}
