import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { UpdateBannerSchema } from "@/validators/admin.validator";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const banner = await prisma.banner.findUnique({ where: { id: params.id } });
  if (!banner) return Errors.notFound("Banner không tồn tại");

  return ok({ banner });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const banner = await prisma.banner.findUnique({ where: { id: params.id } });
  if (!banner) return Errors.notFound("Banner không tồn tại");

  const body = await req.json().catch(() => null);
  const parsed = UpdateBannerSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startsAt !== undefined)
    data.startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null;
  if (parsed.data.expiresAt !== undefined)
    data.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;

  const updated = await prisma.banner.update({ where: { id: params.id }, data });
  return ok({ banner: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const banner = await prisma.banner.findUnique({ where: { id: params.id } });
  if (!banner) return Errors.notFound("Banner không tồn tại");

  await prisma.banner.delete({ where: { id: params.id } });
  return ok({ message: "Đã xóa banner" });
}
