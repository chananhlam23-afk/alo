import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const Schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** PATCH /api/v1/driver/location — driver sends current GPS position */
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body   = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const profile = await prisma.driverProfile.findUnique({
    where: { userId: auth.payload.userId },
    select: { id: true },
  });
  if (!profile) return Errors.notFound("Không tìm thấy hồ sơ tài xế");

  await prisma.driverProfile.update({
    where: { id: profile.id },
    data: {
      currentLat:        parsed.data.lat,
      currentLng:        parsed.data.lng,
      locationUpdatedAt: new Date(),
    },
  });

  return ok({ updated: true });
}
