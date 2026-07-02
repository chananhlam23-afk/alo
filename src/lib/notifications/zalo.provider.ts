const ZALO_ZNS_URL = process.env.ZALO_ZNS_API_URL ?? "https://business.openapi.zalo.me/message/template";

export interface SendZaloOptions {
  phone: string;
  templateId: string;
  templateData: Record<string, string>;
}

export async function sendZaloZNS(opts: SendZaloOptions): Promise<string> {
  const res = await fetch(ZALO_ZNS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: process.env.ZALO_OA_ACCESS_TOKEN!,
    },
    body: JSON.stringify({
      phone: opts.phone,
      template_id: opts.templateId,
      template_data: opts.templateData,
      tracking_id: `td-${Date.now()}`,
    }),
  });

  const json = await res.json();
  if (json.error !== 0) {
    throw new Error(`Zalo ZNS error ${json.error}: ${json.message}`);
  }
  return json.data?.msg_id ?? "";
}
