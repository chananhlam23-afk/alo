import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { UpdateAreaPricingSchema } from "@/validators/admin.validator";
import { updateAreaPricing, deleteAreaPricing } from "@/repositories/pricing.repository";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = UpdateAreaPricingSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const item = await updateAreaPricing(params.id, parsed.data);
  return ok({ areaPricing: item });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  await deleteAreaPricing(params.id);
  return ok({ deleted: true });
}
