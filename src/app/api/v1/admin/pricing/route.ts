import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { UpdatePricingSchema } from "@/validators/admin.validator";
import {
  getActivePricing,
  updatePricing,
  createPricing,
} from "@/repositories/pricing.repository";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const pricing = await getActivePricing();
  return ok({ pricingConfig: pricing });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = UpdatePricingSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const existing = await getActivePricing();

  if (existing) {
    const updated = await updatePricing(existing.id, {
      ...parsed.data,
      cargoPricing: parsed.data.cargoPricing as Prisma.InputJsonValue | undefined,
      surgeRules: parsed.data.surgeRules as Prisma.InputJsonValue | undefined,
      perKmTiers: parsed.data.perKmTiers as Prisma.InputJsonValue | undefined,
      updatedBy: auth.payload.userId,
    });
    return ok({ pricingConfig: updated });
  }

  const created = await createPricing({
    baseFare: parsed.data.baseFare ?? 10000,
    commissionPct: parsed.data.commissionPct ?? 0.15,
    costShareCapPct: parsed.data.costShareCapPct ?? 0.5,
    holdDays: parsed.data.holdDays ?? 3,
    cargoPricing: (parsed.data.cargoPricing ?? {}) as Prisma.InputJsonValue,
    surgeRules: (parsed.data.surgeRules ?? {}) as Prisma.InputJsonValue,
    perKmTiers: (parsed.data.perKmTiers ?? [{ upToKm: 100, pricePerKm: 3500 }]) as Prisma.InputJsonValue,
    updatedBy: auth.payload.userId,
  });

  return ok({ pricingConfig: created });
}
