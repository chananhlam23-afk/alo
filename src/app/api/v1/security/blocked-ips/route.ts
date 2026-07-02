import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * Internal endpoint used by the Edge middleware to populate its in-memory
 * blocked-IP cache without direct Prisma access.
 *
 * Secured by a shared secret (INTERNAL_API_KEY env var). Should NOT be exposed
 * to the public — the middleware matcher already covers /api/* rate limiting,
 * but the INTERNAL_API_KEY adds an additional auth layer.
 */
export async function GET(req: NextRequest) {
  const internalKey = req.headers.get("x-internal-key");
  const expectedKey = process.env.INTERNAL_API_KEY;

  // If INTERNAL_API_KEY is not configured, only allow requests from localhost
  if (expectedKey) {
    if (internalKey !== expectedKey) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    // No key configured — only serve from loopback
    const host = req.headers.get("host") ?? "";
    if (!host.startsWith("localhost") && !host.startsWith("127.0.0.1")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const now = new Date();
  const blocks = await prisma.ipBlock.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { ip: true, reason: true, expiresAt: true },
  });

  return NextResponse.json({ blocks });
}
