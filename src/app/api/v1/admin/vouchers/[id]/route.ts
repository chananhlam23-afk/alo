import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { UpdateVoucherSchema } from "@/validators/admin.validator";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const voucher = await prisma.voucher.findUnique({
    where: { id: params.id },
    include: { usages: { orderBy: { usedAt: "desc" }, take: 20 } },
  });
  if (!voucher) return Errors.notFound("Voucher không tồn tại");

  return ok({ voucher });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const voucher = await prisma.voucher.findUnique({ where: { id: params.id } });
  if (!voucher) return Errors.notFound("Voucher không tồn tại");

  const body = await req.json().catch(() => null);
  const parsed = UpdateVoucherSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const updated = await prisma.voucher.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
    },
  });

  return ok({ voucher: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const voucher = await prisma.voucher.findUnique({ where: { id: params.id } });
  if (!voucher) return Errors.notFound("Voucher không tồn tại");

  await prisma.voucherUsage.deleteMany({ where: { voucherId: params.id } });
  await prisma.voucher.delete({ where: { id: params.id } });

  return ok({ message: "Đã xóa voucher" });
}
