import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

// ─── GET — list all active (and recently expired) IP blocks ──────────────────

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const blocks = await prisma.ipBlock.findMany({
    orderBy: { blockedAt: "desc" },
    take: 200,
  });

  return ok({ blocks });
}

// ─── POST — manually block an IP ─────────────────────────────────────────────

const CreateBlockSchema = z.object({
  ip: z.string().min(7, "IP không hợp lệ"),
  reason: z.string().min(3, "Reason quá ngắn"),
  /** Duration in minutes. Omit for permanent block. */
  durationMinutes: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = CreateBlockSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { ip, reason, durationMinutes } = parsed.data;
  const expiresAt = durationMinutes
    ? new Date(Date.now() + durationMinutes * 60 * 1000)
    : null;

  const adminId = "payload" in auth ? auth.payload.userId : undefined;

  const block = await prisma.ipBlock.upsert({
    where: { ip },
    create: { ip, reason, expiresAt, blockedBy: adminId },
    update: { reason, expiresAt, blockedAt: new Date(), blockedBy: adminId },
  });

  return ok({ block }, 201);
}

// ─── DELETE — unblock an IP ───────────────────────────────────────────────────

const DeleteBlockSchema = z.object({
  ip: z.string().min(7, "IP không hợp lệ"),
});

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = DeleteBlockSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const existing = await prisma.ipBlock.findUnique({ where: { ip: parsed.data.ip } });
  if (!existing) return Errors.notFound("IP block không tồn tại");

  await prisma.ipBlock.delete({ where: { ip: parsed.data.ip } });

  return ok({ message: "IP đã được gỡ khỏi danh sách chặn" });
}
