import { NextRequest, NextResponse } from "next/server";
import { Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { StatsExportSchema } from "@/validators/admin.validator";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = StatsExportSchema.safeParse(params);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const from = new Date(parsed.data.from);
  const to = new Date(parsed.data.to);

  let rows: Record<string, unknown>[] = [];

  switch (parsed.data.type) {
    case "trips":
      rows = await prisma.trip.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: { driverProfile: { include: { user: { select: { phone: true, fullName: true } } } } },
      });
      break;
    case "users":
      rows = await prisma.user.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { id: true, phone: true, fullName: true, role: true, createdAt: true },
      });
      break;
    case "withdrawals":
      rows = await prisma.withdrawalRequest.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: { driverProfile: { include: { user: { select: { phone: true } } } } },
      });
      break;
    case "earnings":
      rows = await prisma.walletTransaction.findMany({
        where: { type: "TRIP_CREDIT", createdAt: { gte: from, lte: to } },
      });
      break;
  }

  const csv = toCSV(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${parsed.data.type}-${Date.now()}.csv"`,
    },
  });
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => JSON.stringify(r[h] ?? "")).join(","),
    ),
  ];
  return lines.join("\n");
}
