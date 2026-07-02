import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { UpdateRouteSchema } from "@/validators/driver.validator";
import {
  findRouteById,
  updateRoute,
  findDriverByUserId,
} from "@/repositories/driver.repository";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.forbidden();

  const route = await findRouteById(params.id);
  if (!route) return Errors.notFound();
  if (route.driverProfileId !== driver.id) return Errors.forbidden();

  const body = await req.json().catch(() => null);
  const parsed = UpdateRouteSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const updated = await updateRoute(params.id, parsed.data);
  return ok({ route: updated });
}
