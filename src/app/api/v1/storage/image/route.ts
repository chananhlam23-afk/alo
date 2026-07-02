import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { createServiceClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, ensureMediaBucket, publicUrl } from "@/lib/supabase/storage";
import { uploadRateLimit, checkRateLimit } from "@/lib/security/rate-limit";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/** Nhận diện định dạng ảnh thật qua magic bytes (không tin MIME do client khai). */
function sniffImage(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return { ext: "webp", mime: "image/webp" };
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return { ext: "gif", mime: "image/gif" };
  return null;
}

/**
 * Upload ảnh chung (banner, blog, sự kiện, ảnh đại diện…) lên bucket public `media`.
 * Nhận multipart/form-data field `file`, trả về { url } là URL công khai để lưu vào form.
 * Người dùng vẫn có thể dán URL trực tiếp — endpoint này chỉ phục vụ nhánh "tải từ máy".
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  // Siết tần suất theo user (upload ghi storage → tốn kém, dễ bị lạm dụng).
  const { limited } = await checkRateLimit(uploadRateLimit, auth.payload.userId);
  if (limited) return Errors.rateLimited("Tải ảnh quá nhanh, vui lòng thử lại sau ít phút");

  // Chặn body quá lớn NGAY qua Content-Length, trước khi đọc cả body vào RAM.
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILE_SIZE + 512 * 1024) {
    return Errors.validation("File quá lớn (tối đa 10MB)");
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Errors.validation("Dữ liệu form không hợp lệ");
  }

  const file = formData.get("file") as File | null;
  if (!file) return Errors.validation("Thiếu file ảnh");
  if (file.size > MAX_FILE_SIZE) return Errors.validation("File quá lớn (tối đa 10MB)");

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buffer);
  if (!kind) return Errors.validation("Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF");

  const supabase = createServiceClient();
  if (!supabase) return Errors.internal("Storage chưa được cấu hình");

  await ensureMediaBucket();

  // Path gắn userId + tên ngẫu nhiên (không đoán/ghi đè được).
  const path = `uploads/${auth.payload.userId}/${randomUUID()}.${kind.ext}`;

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, buffer, { contentType: kind.mime, upsert: false });

  if (uploadError) return Errors.internal(uploadError.message);

  return ok({ url: publicUrl(MEDIA_BUCKET, path) });
}
