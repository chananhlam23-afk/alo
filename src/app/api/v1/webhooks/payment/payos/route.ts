import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handlePayOSWebhook } from "@/services/payment.service";
import type { PayOSWebhookBody } from "@/lib/payments/payos";

const WebhookSchema = z.object({
  code: z.string(),
  desc: z.string(),
  success: z.boolean(),
  signature: z.string(),
  data: z
    .object({
      orderCode: z.union([z.number(), z.string()]),
      amount: z.number(),
      reference: z.string().optional(),
      transactionDateTime: z.string().optional(),
      code: z.string().optional(),
      desc: z.string().optional(),
    })
    .passthrough(),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ code: "99", desc: "Invalid JSON" }, { status: 400 });
  }

  const parsed = WebhookSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ code: "99", desc: "Invalid body" }, { status: 400 });
  }
  const body = parsed.data as unknown as PayOSWebhookBody;

  try {
    await handlePayOSWebhook(body);
    return NextResponse.json({ code: "00", desc: "success" });
  } catch (e) {
    console.error("[PayOS webhook]", e);
    return NextResponse.json({ code: "99", desc: "Error" }, { status: 500 });
  }
}
