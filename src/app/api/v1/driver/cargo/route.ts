import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { findPendingCargoNearRoute } from "@/repositories/cargo.repository";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const QuerySchema = z.object({
  originLat:  z.coerce.number(),
  originLng:  z.coerce.number(),
  destLat:    z.coerce.number(),
  destLng:    z.coerce.number(),
  radiusKm:   z.coerce.number().min(1).max(50).default(20),
});

/** GET /api/v1/driver/cargo — hàng sẵn sàng ghép gần tuyến của tài xế */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.forbidden("Chỉ dành cho tài xế");
  if (!driver.allowCargo) return ok({ items: [], message: "Tài xế chưa bật ghép hàng" });

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    // Nếu không truyền tọa độ, dùng route mới nhất của tài xế
    const route = await prisma.driverRoute.findFirst({
      where: { driverProfileId: driver.id, status: "ACTIVE" },
      orderBy: { departureTime: "desc" },
    });
    if (!route) return ok({ items: [] });

    const items = await findPendingCargoNearRoute(
      route.originLat, route.originLng,
      route.destLat, route.destLng,
    );
    return ok({ items, total: items.length });
  }

  const items = await findPendingCargoNearRoute(
    parsed.data.originLat, parsed.data.originLng,
    parsed.data.destLat, parsed.data.destLng,
    parsed.data.radiusKm,
  );

  return ok({ items, total: items.length });
}
