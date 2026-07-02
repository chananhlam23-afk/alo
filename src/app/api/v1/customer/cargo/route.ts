import { NextRequest } from "next/server";
import { ok, created, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { createCargo, quoteCargo } from "@/services/cargo.service";
import { findCargoBySender, cancelCargo } from "@/repositories/cargo.repository";
import { notify } from "@/lib/notifications/notification.service";
import { z } from "zod";

const CreateCargoSchema = z.object({
  pickupAddress:  z.string().min(1).max(500),
  pickupLat:      z.number().min(-90).max(90),
  pickupLng:      z.number().min(-180).max(180),
  dropoffAddress: z.string().min(1).max(500),
  dropoffLat:     z.number().min(-90).max(90),
  dropoffLng:     z.number().min(-180).max(180),
  weightKg:       z.number().min(0.1).max(200),
  description:    z.string().max(500).optional(),
  distanceKm:     z.number().min(0.1),
  receiverName:   z.string().min(1).max(100),
  receiverPhone:  z.string().min(9).max(12).regex(/^[0-9]+$/),
});

const QuoteSchema = z.object({
  distanceKm: z.coerce.number().min(0.1),
  weightKg:   z.coerce.number().min(0.1),
});

/** GET /api/v1/customer/cargo — danh sách hàng đã gửi */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const items = await findCargoBySender(auth.payload.userId);
  return ok({ items, total: items.length });
}

/** POST /api/v1/customer/cargo — tạo yêu cầu gửi hàng */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body   = await req.json().catch(() => null);
  const parsed = CreateCargoSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const result = await createCargo({
    senderId: auth.payload.userId,
    ...parsed.data,
  });

  // Thông báo cho khách: đặt gửi hàng thành công (email + Zalo ZNS). Fire-and-forget.
  void notify({
    userId: auth.payload.userId,
    event: "CARGO_REQUEST_CREATED",
    templateData: {
      pickup: parsed.data.pickupAddress,
      dropoff: parsed.data.dropoffAddress,
      receiverName: parsed.data.receiverName,
      weightKg: String(parsed.data.weightKg),
      price: result.quotedPrice.toLocaleString("vi-VN"),
    },
  });

  return created(result);
}
