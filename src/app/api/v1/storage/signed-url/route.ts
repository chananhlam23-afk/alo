import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { kycDownloadUrl } from "@/lib/supabase/storage";
import { z } from "zod";

const Schema = z.object({
  path: z.string().min(1).max(500),
});

// Admin hoặc chính tài xế đó mới được xem ảnh KYC
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  if (auth.payload.role !== "ADMIN") {
    const driverIdFromPath = parsed.data.path.split("/")[0];
    const { prisma } = await import("@/lib/db/prisma");
    const driver = await prisma.driverProfile.findFirst({
      where: { id: driverIdFromPath, userId: auth.payload.userId },
    });
    if (!driver) return Errors.forbidden("Không có quyền xem tài liệu này");
  }

  const signedUrl = await kycDownloadUrl(parsed.data.path);
  return ok({ signedUrl });
}
