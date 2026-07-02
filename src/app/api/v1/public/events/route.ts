import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const revalidate = 120;

export async function GET() {
  const now = new Date();

  const events = await prisma.promotionEvent.findMany({
    where: {
      status: "ACTIVE",
      startsAt: { lte: now },
      endsAt:   { gte: now },
    },
    orderBy: { startsAt: "asc" },
    take: 5,
    select: {
      id: true, name: true, description: true,
      imageUrl: true, type: true, targetAudience: true,
      startsAt: true, endsAt: true,
    },
  });

  return NextResponse.json(
    { success: true, data: { events } },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } },
  );
}
