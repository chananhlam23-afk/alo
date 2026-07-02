import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  type: z.string().optional(),
  ip: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const { searchParams } = req.nextUrl;
  const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { page, limit, severity, type, ip } = parsed.data;
  const skip = (page - 1) * limit;

  const where = {
    ...(severity ? { severity } : {}),
    ...(type ? { type: { contains: type, mode: "insensitive" as const } } : {}),
    ...(ip ? { ip: { contains: ip } } : {}),
  };

  const [events, total] = await Promise.all([
    prisma.securityEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.securityEvent.count({ where }),
  ]);

  return ok({
    events,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
