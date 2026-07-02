import { createHmac } from "crypto";

const CLIENT_ID = () => process.env.PAYOS_CLIENT_ID!;
const API_KEY = () => process.env.PAYOS_API_KEY!;
const CHECKSUM_KEY = () => process.env.PAYOS_CHECKSUM_KEY!;
const RETURN_URL = () => process.env.PAYOS_RETURN_URL!;
const CANCEL_URL = () => process.env.PAYOS_CANCEL_URL!;
const PAYOS_BASE = process.env.PAYOS_API_BASE_URL ?? "https://api-merchant.payos.vn";

function sign(data: string): string {
  return createHmac("sha256", CHECKSUM_KEY()).update(data).digest("hex");
}

export interface PayOSCreateOptions {
  orderCode: number;
  amount: number;
  description: string;
}

export interface PayOSCreateResult {
  checkoutUrl: string;
  paymentLinkId: string;
  qrCode: string;
}

export async function createPayOSLink(opts: PayOSCreateOptions): Promise<PayOSCreateResult> {
  const cancelUrl = CANCEL_URL();
  const returnUrl = RETURN_URL();

  // PayOS signature: các field sorted theo alphabet
  const signData = `amount=${opts.amount}&cancelUrl=${cancelUrl}&description=${opts.description}&orderCode=${opts.orderCode}&returnUrl=${returnUrl}`;
  const signature = sign(signData);

  const res = await fetch(`${PAYOS_BASE}/v2/payment-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": CLIENT_ID(),
      "x-api-key": API_KEY(),
    },
    body: JSON.stringify({
      orderCode: opts.orderCode,
      amount: opts.amount,
      description: opts.description,
      cancelUrl,
      returnUrl,
      signature,
    }),
  });

  if (!res.ok) throw new Error(`PayOS HTTP ${res.status}`);
  const json = await res.json();
  if (json.code !== "00") throw new Error(`PayOS: ${json.desc}`);

  return {
    checkoutUrl: json.data.checkoutUrl,
    paymentLinkId: json.data.paymentLinkId,
    qrCode: json.data.qrCode,
  };
}

export interface PayOSWebhookData {
  orderCode: number;
  amount: number;
  description: string;
  reference: string;
  transactionDateTime: string;
  paymentLinkId: string;
  code: string;
  desc: string;
}

export interface PayOSWebhookBody {
  code: string;
  desc: string;
  success: boolean;
  data: PayOSWebhookData;
  signature: string;
}

export function verifyPayOSWebhook(body: PayOSWebhookBody): boolean {
  const d = body.data;
  const signData = `amount=${d.amount}&code=${d.code}&desc=${d.desc}&orderCode=${d.orderCode}&reference=${d.reference}&transactionDateTime=${d.transactionDateTime}`;
  return sign(signData) === body.signature;
}
