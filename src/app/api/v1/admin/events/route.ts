import { NextRequest } from "next/server";
import { ok, created, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { CreateEventSchema, ListQuerySchema } from "@/validators/admin.validator";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const query = ListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!query.success) return Errors.validation(query.error.errors[0].message);

  const { page, limit, status } = query.data;
  const where = status && status !== "ALL" ? { status: status as never } : {};

  const [events, total] = await Promise.all([
    prisma.promotionEvent.findMany({
      where,
      orderBy: { startsAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.promotionEvent.count({ where }),
  ]);

  return ok({ events, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = CreateEventSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  if (new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt)) {
    return Errors.validation("Ngày kết thúc phải sau ngày bắt đầu");
  }

  const event = await prisma.promotionEvent.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl,
      type: parsed.data.type,
      config: parsed.data.config as Prisma.InputJsonValue,
      targetAudience: parsed.data.targetAudience,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      budget: parsed.data.budget,
      createdBy: auth.payload.userId,
    },
  });

  return created({ event });
}
