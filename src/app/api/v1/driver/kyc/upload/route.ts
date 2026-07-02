import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { createServiceClient } from "@/lib/supabase/client";
import {
  KYC_BUCKET, AVATAR_BUCKET,
  ensureKycBucket, ensureAvatarBucket,
  createDownloadSignedUrl, publicUrl,
} from "@/lib/supabase/storage";

const ALLOWED_DOC_TYPES = ["CCCD_FRONT", "CCCD_BACK", "DRIVER_LICENSE", "VEHICLE_REGISTRATION", "SELFIE"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/** Nhận diện định dạng ảnh thật qua magic bytes (không tin MIME do client khai). */
function sniffImage(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Errors.validation("Dữ liệu form không hợp lệ");
  }

  const file = formData.get("file") as File | null;
  const docType = formData.get("type") as string | null;

  if (!file) return Errors.validation("Thiếu file ảnh");
  if (!docType || !ALLOWED_DOC_TYPES.includes(docType)) return Errors.validation("Loại giấy tờ không hợp lệ");
  if (file.size > MAX_FILE_SIZE) return Errors.validation("File quá lớn (tối đa 10MB)");

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buffer);
  if (!kind) return Errors.validation("Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP");

  const supabase = createServiceClient();
  if (!supabase) return Errors.internal("Storage chưa được cấu hình");

  await ensureKycBucket();

  // Path gắn với userId (chống IDOR) + tên ngẫu nhiên (không đoán/ghi đè được).
  const path = `kyc/${auth.payload.userId}/${docType}-${randomUUID()}.${kind.ext}`;

  const { error: uploadError } = await supabase.storage
    .from(KYC_BUCKET)
    .upload(path, buffer, { contentType: kind.mime, upsert: false });

  if (uploadError) return Errors.internal(uploadError.message);

  // Trả signed URL ngắn hạn để client xem trước; CHỈ path được lưu vào DB.
  let url: string | null = null;
  try {
    url = await createDownloadSignedUrl(KYC_BUCKET, path, 3600);
  } catch {
    /* preview optional */
  }

  // SELFIE (ảnh gương mặt) → tự dùng làm ẢNH ĐẠI DIỆN ngay: publish bản sao lên
  // bucket avatars (public) và cập nhật user.avatarUrl. Lỗi ở đây không chặn KYC.
  let avatarUrl: string | null = null;
  if (docType === "SELFIE") {
    try {
      await ensureAvatarBucket();
      const avatarPath = `${auth.payload.userId}/avatar-${randomUUID()}.${kind.ext}`;
      const { error: avErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(avatarPath, buffer, { contentType: kind.mime, upsert: true });
      if (!avErr) {
        avatarUrl = publicUrl(AVATAR_BUCKET, avatarPath);
        await prisma.user.update({
          where: { id: auth.payload.userId },
          data: { avatarUrl },
        });
      }
    } catch {
      /* avatar là tuỳ chọn — bỏ qua nếu lỗi */
    }
  }

  return ok({ path, url, ...(avatarUrl ? { avatarUrl } : {}) });
}
