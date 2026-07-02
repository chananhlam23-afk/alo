import { createServiceClient } from "./client";

export const KYC_BUCKET = "kyc-documents";
export const AVATAR_BUCKET = "avatars";
export const MEDIA_BUCKET = "media";

export type UploadResult = { path: string; signedUrl?: string };

/** Tạo bucket KYC (private) nếu chưa có — idempotent. */
export async function ensureKycBucket(): Promise<void> {
  const supabase = createServiceClient();
  if (!supabase) return;
  try {
    await supabase.storage.createBucket(KYC_BUCKET, { public: false });
  } catch {
    /* đã tồn tại — bỏ qua */
  }
}

/** Tạo bucket avatar (PUBLIC — ảnh đại diện hiển thị công khai) nếu chưa có. */
export async function ensureAvatarBucket(): Promise<void> {
  const supabase = createServiceClient();
  if (!supabase) return;
  try {
    await supabase.storage.createBucket(AVATAR_BUCKET, { public: true });
  } catch {
    /* đã tồn tại — bỏ qua */
  }
}

/** Tạo bucket media (PUBLIC — ảnh banner/blog/sự kiện… hiển thị công khai) nếu chưa có. */
export async function ensureMediaBucket(): Promise<void> {
  const supabase = createServiceClient();
  if (!supabase) return;
  try {
    await supabase.storage.createBucket(MEDIA_BUCKET, { public: true });
  } catch {
    /* đã tồn tại — bỏ qua */
  }
}

/** Ký nhiều path cùng lúc (1 request) → map path → signedUrl. */
export async function createDownloadSignedUrls(
  bucket: string,
  paths: string[],
  expiresInSeconds = 3600,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return out;
  const supabase = createServiceClient();
  if (!supabase) return out;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(unique, expiresInSeconds);
  for (const d of data ?? []) {
    if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  }
  return out;
}

/**
 * Tạo signed URL để client upload trực tiếp lên Supabase Storage.
 * Server không cần xử lý binary — client upload thẳng, gửi URL lại cho server.
 */
export async function createUploadSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 300,
): Promise<string> {
  const supabase = createServiceClient();
  if (!supabase) throw new Error("Supabase Storage chưa được cấu hình");
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error || !data) throw new Error(`Storage upload URL error: ${error?.message}`);
  return data.signedUrl;
}

/**
 * Tạo signed URL để đọc file (KYC docs — private).
 */
export async function createDownloadSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const supabase = createServiceClient();
  if (!supabase) throw new Error("Supabase Storage chưa được cấu hình");
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) throw new Error(`Storage download URL error: ${error?.message}`);
  return data.signedUrl;
}

export async function kycUploadUrl(driverProfileId: string, docType: string) {
  const path = `${driverProfileId}/${docType}-${Date.now()}.jpg`;
  const signedUrl = await createUploadSignedUrl(KYC_BUCKET, path);
  return { path, signedUrl };
}

export async function kycDownloadUrl(path: string) {
  return createDownloadSignedUrl(KYC_BUCKET, path, 3600);
}

export async function avatarUploadUrl(userId: string) {
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const signedUrl = await createUploadSignedUrl(AVATAR_BUCKET, path);
  return { path, signedUrl };
}

export function publicUrl(bucket: string, path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
