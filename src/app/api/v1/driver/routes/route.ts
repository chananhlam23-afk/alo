import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { CreateRouteSchema } from "@/validators/driver.validator";
import { createDriverRoute } from "@/services/driver.service";
import { findDriverByUserId, findRoutesByDriver } from "@/repositories/driver.repository";

const RoutesQuerySchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.notFound("Hồ sơ tài xế không tồn tại");

  const parsed = RoutesQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const status = parsed.data.status;
  const routes = await findRoutesByDriver(driver.id, status);

  return ok({ items: routes, total: routes.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.notFound("Hồ sơ tài xế không tồn tại");
  if (driver.verificationStatus !== "APPROVED") return Errors.kycPending();

  const body = await req.json().catch(() => null);
  const parsed = CreateRouteSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const route = await createDriverRoute(driver.id, parsed.data);
  return created({ route });
}
