import { NextRequest } from "next/server";
import { ok, created, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { CreateVoucherSchema, ListQuerySchema } from "@/validators/admin.validator";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const query = ListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!query.success) return Errors.validation(query.error.errors[0].message);

  const { page, limit, status } = query.data;

  const where = status && status !== "ALL" ? { status: status as never } : {};

  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.voucher.count({ where }),
  ]);

  return ok({ vouchers, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = CreateVoucherSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const existing = await prisma.voucher.findUnique({ where: { code: parsed.data.code } });
  if (existing) return Errors.conflict("Mã voucher đã tồn tại");

  if (new Date(parsed.data.expiresAt) <= new Date(parsed.data.startsAt)) {
    return Errors.validation("Ngày hết hạn phải sau ngày bắt đầu");
  }

  const voucher = await prisma.voucher.create({
    data: {
      ...parsed.data,
      startsAt: new Date(parsed.data.startsAt),
      expiresAt: new Date(parsed.data.expiresAt),
      createdBy: auth.payload.userId,
    },
  });

  return created({ voucher });
}
