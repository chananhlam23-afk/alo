import { NextRequest } from "next/server";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const items = await prisma.notificationLog.findMany({
    where: { userId: auth.payload.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, event: true, channel: true, status: true, createdAt: true, payload: true },
  });

  return ok({ items });
}
