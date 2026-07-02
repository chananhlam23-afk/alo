import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import {
  evaluateVoucher,
  parseConditions,
  extractProvince,
  VOUCHER_SERVICES,
  VOUCHER_BOOKING_MODES,
  VOUCHER_PAYMENT_METHODS,
  type VoucherCore,
} from "@/lib/vouchers/conditions";
import { buildVoucherContext } from "@/lib/vouchers/context";

const ValidateSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  orderValue: z.number().int().min(0),
  // Ngữ cảnh đơn hàng (tuỳ chọn) để kiểm tra điều kiện phạm vi
  service: z.enum(VOUCHER_SERVICES).optional(),
  seats: z.number().int().min(1).max(9).optional(),
  distanceKm: z.number().min(0).optional(),
  bookingMode: z.enum(VOUCHER_BOOKING_MODES).optional(),
  paymentMethod: z.enum(VOUCHER_PAYMENT_METHODS).optional(),
  pickupAddress: z.string().max(500).optional(),
  dropoffAddress: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "CUSTOMER");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = ValidateSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { code, orderValue, service, seats, distanceKm, bookingMode, paymentMethod, pickupAddress, dropoffAddress } = parsed.data;
  const userId = auth.payload.userId;

  const voucher = await prisma.voucher.findUnique({ where: { code } });
  if (!voucher) return Errors.notFound("Mã voucher không tồn tại");

  const ctx = await buildVoucherContext({
    voucherId: voucher.id,
    userId,
    userRole: "CUSTOMER",
    orderValue,
    order: {
      service,
      seats,
      distanceKm,
      bookingMode,
      paymentMethod,
      originProvince: extractProvince(pickupAddress),
      destProvince: extractProvince(dropoffAddress),
    },
  });

  const result = evaluateVoucher(voucher as VoucherCore, parseConditions(voucher.conditions), ctx);
  if (!result.ok) return Errors.validation(result.reason);

  return ok({
    voucher: {
      id: voucher.id,
      code: voucher.code,
      name: voucher.name,
      type: voucher.type,
      value: voucher.value,
    },
    discount: result.discount,
    finalPrice: result.finalPrice,
    orderValue,
  });
}
