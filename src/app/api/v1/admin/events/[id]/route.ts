import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { UpdateEventSchema } from "@/validators/admin.validator";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const event = await prisma.promotionEvent.findUnique({ where: { id: params.id } });
  if (!event) return Errors.notFound("Sự kiện không tồn tại");

  return ok({ event });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const event = await prisma.promotionEvent.findUnique({ where: { id: params.id } });
  if (!event) return Errors.notFound("Sự kiện không tồn tại");

  if (event.status === "ENDED") {
    return Errors.forbidden("Sự kiện đã kết thúc, không thể chỉnh sửa");
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateEventSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.imageUrl !== undefined) data.imageUrl = parsed.data.imageUrl;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.config !== undefined) data.config = parsed.data.config as Prisma.InputJsonValue;
  if (parsed.data.endsAt !== undefined) data.endsAt = new Date(parsed.data.endsAt);
  if (parsed.data.budget !== undefined) data.budget = parsed.data.budget;

  const updated = await prisma.promotionEvent.update({ where: { id: params.id }, data });
  return ok({ event: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const event = await prisma.promotionEvent.findUnique({ where: { id: params.id } });
  if (!event) return Errors.notFound("Sự kiện không tồn tại");

  if (event.status === "ACTIVE") {
    return Errors.forbidden("Không thể xóa sự kiện đang chạy. Kết thúc sự kiện trước.");
  }

  await prisma.promotionEvent.delete({ where: { id: params.id } });
  return ok({ message: "Đã xóa sự kiện" });
}
