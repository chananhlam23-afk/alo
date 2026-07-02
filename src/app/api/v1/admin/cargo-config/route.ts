import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { UpdateCargoConfigSchema } from "@/validators/admin.validator";
import { getCargoConfig, upsertCargoConfig } from "@/repositories/pricing.repository";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const config = await getCargoConfig();
  return ok({ cargoConfig: config });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = UpdateCargoConfigSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const config = await upsertCargoConfig(parsed.data);
  return ok({ cargoConfig: config });
}
