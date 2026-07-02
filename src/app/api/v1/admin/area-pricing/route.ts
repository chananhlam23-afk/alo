import { NextRequest } from "next/server";
import { ok, created, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { CreateAreaPricingSchema } from "@/validators/admin.validator";
import { listAreaPricing, createAreaPricing } from "@/repositories/pricing.repository";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const items = await listAreaPricing();
  return ok({ items, total: items.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = CreateAreaPricingSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  try {
    const item = await createAreaPricing(parsed.data);
    return created({ areaPricing: item });
  } catch {
    return Errors.conflict("Bảng giá khu vực đã tồn tại");
  }
}
