import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { releaseMaturedTransactions } from "@/repositories/wallet.repository";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const released = await releaseMaturedTransactions();
  console.info(`[Cron] Released ${released} wallet transactions`);

  return NextResponse.json({ released });
}

// Also support GET for Vercel Cron (which uses GET by default)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const released = await releaseMaturedTransactions();
  return NextResponse.json({ released });
}
