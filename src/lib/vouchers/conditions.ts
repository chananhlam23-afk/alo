/**
 * Bộ điều kiện áp dụng nâng cao cho Voucher.
 *
 * Toàn bộ cấu hình "phức tạp" (đối tượng áp dụng, điều kiện đơn, phạm vi dịch vụ /
 * khu vực / thời gian, giới hạn & ngân sách) được lưu trong cột JSON `voucher.conditions`.
 * Module này là nguồn chân lý DUY NHẤT cho:
 *   - Schema Zod để validate khi admin tạo/sửa voucher
 *   - Hàm đánh giá `evaluateVoucher()` dùng chung cho cả luồng /validate và luồng đặt chuyến
 *   - Hàm `summarizeConditions()` sinh nhãn tiếng Việt cho UI
 *
 * KHÔNG import prisma ở đây (giữ module thuần, test được). Việc truy vấn dữ liệu
 * người dùng để dựng context nằm ở src/lib/vouchers/context.ts.
 */
import { z } from "zod";

/* ─── Hằng số lựa chọn ───────────────────────────────────────────────────── */

export const VOUCHER_AUDIENCES = [
  "ALL",
  "NEW_USER",
  "EXISTING_USER",
  "INACTIVE_USER",
  "SPECIFIC_USERS",
] as const;
export type VoucherAudience = (typeof VOUCHER_AUDIENCES)[number];

export const VOUCHER_SERVICES = ["RIDE", "CARGO"] as const;
export type VoucherService = (typeof VOUCHER_SERVICES)[number];

export const VOUCHER_BOOKING_MODES = ["OPEN_WAIT", "DIRECT_BOOK"] as const;
export type VoucherBookingMode = (typeof VOUCHER_BOOKING_MODES)[number];

export const VOUCHER_PAYMENT_METHODS = ["PAYOS", "WALLET"] as const;
export type VoucherPaymentMethod = (typeof VOUCHER_PAYMENT_METHODS)[number];

/* ─── Nhãn tiếng Việt ────────────────────────────────────────────────────── */

export const AUDIENCE_LABEL: Record<VoucherAudience, string> = {
  ALL: "Tất cả người dùng",
  NEW_USER: "Khách hàng mới",
  EXISTING_USER: "Khách hàng cũ",
  INACTIVE_USER: "Khách lâu không đi (winback)",
  SPECIFIC_USERS: "Danh sách chỉ định",
};

export const SERVICE_LABEL: Record<VoucherService, string> = {
  RIDE: "Đặt chuyến xe",
  CARGO: "Giao hàng",
};

export const BOOKING_MODE_LABEL: Record<VoucherBookingMode, string> = {
  OPEN_WAIT: "Chờ ghép chuyến",
  DIRECT_BOOK: "Đặt trực tiếp tài xế",
};

export const PAYMENT_METHOD_LABEL: Record<VoucherPaymentMethod, string> = {
  PAYOS: "Cổng PayOS",
  WALLET: "Ví Thuận Chuyến",
};

export const DOW_LABEL = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]; // 0..6 (getDay)

/* ─── Schema Zod ─────────────────────────────────────────────────────────── */

export const VoucherConditionsSchema = z
  .object({
    /* Đối tượng áp dụng */
    audience: z.enum(VOUCHER_AUDIENCES).default("ALL"),
    firstOrderOnly: z.boolean().default(false),
    newUserWithinDays: z.number().int().min(1).max(365).optional(),
    inactiveDays: z.number().int().min(1).max(365).optional(),
    minUserTrips: z.number().int().min(0).max(10000).optional(),
    specificUserIds: z.array(z.string().trim().min(1).max(64)).max(5000).default([]),

    /* Điều kiện đơn hàng */
    maxOrderValue: z.number().int().min(0).optional(),
    minSeats: z.number().int().min(1).max(9).optional(),
    minDistanceKm: z.number().min(0).max(2000).optional(),
    maxDistanceKm: z.number().min(0).max(2000).optional(),

    /* Phạm vi áp dụng */
    services: z.array(z.enum(VOUCHER_SERVICES)).max(2).default([]),
    bookingModes: z.array(z.enum(VOUCHER_BOOKING_MODES)).max(2).default([]),
    paymentMethods: z.array(z.enum(VOUCHER_PAYMENT_METHODS)).max(2).default([]),
    originProvinces: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
    destProvinces: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    activeFromHour: z.number().int().min(0).max(23).optional(),
    activeToHour: z.number().int().min(0).max(23).optional(),

    /* Giới hạn & ngân sách */
    userDailyLimit: z.number().int().min(1).max(100).optional(),
    totalBudget: z.number().int().min(0).optional(),

    /* Hành vi */
    stackable: z.boolean().default(false),
    autoApply: z.boolean().default(false),
    priority: z.number().int().min(0).max(1000).default(0),
  })
  .strip()
  .superRefine((c, ctx) => {
    if (c.maxDistanceKm != null && c.minDistanceKm != null && c.maxDistanceKm < c.minDistanceKm) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Quãng đường tối đa phải ≥ tối thiểu", path: ["maxDistanceKm"] });
    }
  });

export type VoucherConditions = z.infer<typeof VoucherConditionsSchema>;

export const DEFAULT_CONDITIONS: VoucherConditions = VoucherConditionsSchema.parse({});

/** Phân tích an toàn giá trị JSON từ DB → object đã chuẩn hoá (luôn trả về object hợp lệ). */
export function parseConditions(raw: unknown): VoucherConditions {
  const r = VoucherConditionsSchema.safeParse(raw ?? {});
  return r.success ? r.data : DEFAULT_CONDITIONS;
}

/* ─── Đánh giá điều kiện ─────────────────────────────────────────────────── */

export interface VoucherCore {
  id: string;
  type: "PERCENT" | "FIXED_AMOUNT" | "FREE_TRIP";
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  userLimit: number;
  startsAt: Date;
  expiresAt: Date;
  status: string;
  targetRole: string | null;
}

export interface VoucherEvalContext {
  now: Date;
  orderValue: number;
  userId: string;
  userRole: string;
  userPhone?: string | null;

  /* Thống kê người dùng (dựng từ DB) */
  userCreatedAt?: Date;
  userCompletedTrips?: number;
  lastTripAt?: Date | null;
  userUsageCount: number;
  userUsageToday: number;
  budgetSpent: number;

  /* Ngữ cảnh đơn hàng (tuỳ chọn — bỏ qua check nếu không có) */
  service?: VoucherService;
  seats?: number;
  distanceKm?: number;
  bookingMode?: VoucherBookingMode;
  paymentMethod?: VoucherPaymentMethod;
  originProvince?: string;
  destProvince?: string;
}

export type EvalResult =
  | { ok: true; discount: number; finalPrice: number }
  | { ok: false; reason: string };

const fmtMoney = (n: number) => n.toLocaleString("vi-VN") + "đ";
const ROLE_VI: Record<string, string> = { CUSTOMER: "khách hàng", DRIVER: "tài xế", ADMIN: "quản trị" };

/** Tính số tiền giảm thô (chưa trừ ngân sách) cho một voucher trên một đơn. */
export function computeDiscount(core: VoucherCore, orderValue: number): number {
  let discount = 0;
  if (core.type === "PERCENT") {
    discount = Math.round(orderValue * (core.value / 100));
    if (core.maxDiscount) discount = Math.min(discount, core.maxDiscount);
  } else if (core.type === "FIXED_AMOUNT") {
    discount = Math.min(core.value, orderValue);
  } else if (core.type === "FREE_TRIP") {
    discount = core.maxDiscount ? Math.min(orderValue, core.maxDiscount) : orderValue;
  }
  return Math.max(0, Math.min(discount, orderValue));
}

const includesCI = (arr: string[], v?: string) =>
  v != null && arr.some((a) => a.trim().toLowerCase() === v.trim().toLowerCase());

/**
 * Đánh giá đầy đủ một voucher với ngữ cảnh cho trước.
 * Trả về { ok:true, discount, finalPrice } hoặc { ok:false, reason } (lý do tiếng Việt).
 */
export function evaluateVoucher(
  core: VoucherCore,
  conditions: VoucherConditions,
  ctx: VoucherEvalContext,
): EvalResult {
  const c = conditions;
  const completedTrips = ctx.userCompletedTrips ?? 0;

  /* 1. Trạng thái & thời gian hiệu lực */
  if (core.status !== "ACTIVE") return fail("Voucher đã bị tạm dừng hoặc hết hiệu lực");
  if (ctx.now < core.startsAt) return fail("Voucher chưa đến ngày hiệu lực");
  if (ctx.now > core.expiresAt) return fail("Voucher đã hết hạn");

  /* 2. Vai trò & đối tượng */
  if (core.targetRole && core.targetRole !== ctx.userRole) {
    return fail(`Voucher chỉ áp dụng cho ${ROLE_VI[core.targetRole] ?? core.targetRole}`);
  }
  if (c.audience === "SPECIFIC_USERS") {
    const allowed = c.specificUserIds.includes(ctx.userId) || includesCI(c.specificUserIds, ctx.userPhone ?? undefined);
    if (!allowed) return fail("Tài khoản của bạn không nằm trong danh sách áp dụng");
  } else if (c.audience === "NEW_USER") {
    if (completedTrips > 0) return fail("Voucher chỉ dành cho khách hàng mới");
    if (c.newUserWithinDays != null && ctx.userCreatedAt) {
      const ageDays = (ctx.now.getTime() - ctx.userCreatedAt.getTime()) / 86400000;
      if (ageDays > c.newUserWithinDays) return fail(`Voucher chỉ dành cho tài khoản mới trong ${c.newUserWithinDays} ngày`);
    }
  } else if (c.audience === "EXISTING_USER") {
    if (completedTrips < 1) return fail("Voucher chỉ dành cho khách hàng đã từng đi chuyến");
  } else if (c.audience === "INACTIVE_USER") {
    if (c.inactiveDays != null) {
      if (!ctx.lastTripAt) return fail("Voucher chỉ dành cho khách từng đi chuyến nhưng lâu chưa quay lại");
      const idleDays = (ctx.now.getTime() - ctx.lastTripAt.getTime()) / 86400000;
      if (idleDays < c.inactiveDays) return fail(`Voucher chỉ áp dụng khi bạn chưa đi chuyến nào trong ${c.inactiveDays} ngày gần đây`);
    }
  }
  if (c.firstOrderOnly && completedTrips > 0) return fail("Voucher chỉ áp dụng cho chuyến đầu tiên");
  if (c.minUserTrips != null && completedTrips < c.minUserTrips) {
    return fail(`Cần hoàn thành tối thiểu ${c.minUserTrips} chuyến để dùng voucher này`);
  }

  /* 3. Giới hạn lượt & ngân sách */
  if (core.usageLimit !== null && core.usedCount >= core.usageLimit) return fail("Voucher đã hết lượt sử dụng");
  if (ctx.userUsageCount >= core.userLimit) return fail("Bạn đã dùng voucher này đủ số lần cho phép");
  if (c.userDailyLimit != null && ctx.userUsageToday >= c.userDailyLimit) {
    return fail("Bạn đã dùng voucher này đủ số lần trong hôm nay");
  }
  if (c.totalBudget != null && ctx.budgetSpent >= c.totalBudget) return fail("Ngân sách khuyến mãi đã hết");

  /* 4. Điều kiện giá trị đơn */
  if (ctx.orderValue < core.minOrderValue) {
    return fail(`Đơn tối thiểu ${fmtMoney(core.minOrderValue)} để áp dụng voucher này`);
  }
  if (c.maxOrderValue != null && ctx.orderValue > c.maxOrderValue) {
    return fail(`Voucher chỉ áp dụng cho đơn đến ${fmtMoney(c.maxOrderValue)}`);
  }

  /* 5. Phạm vi dịch vụ / chế độ đặt / thanh toán */
  if (c.services.length && ctx.service && !c.services.includes(ctx.service)) {
    return fail(`Voucher chỉ áp dụng cho: ${c.services.map((s) => SERVICE_LABEL[s]).join(", ")}`);
  }
  if (c.bookingModes.length && ctx.bookingMode && !c.bookingModes.includes(ctx.bookingMode)) {
    return fail(`Voucher chỉ áp dụng cho: ${c.bookingModes.map((m) => BOOKING_MODE_LABEL[m]).join(", ")}`);
  }
  if (c.paymentMethods.length && ctx.paymentMethod && !c.paymentMethods.includes(ctx.paymentMethod)) {
    return fail(`Voucher chỉ áp dụng khi thanh toán bằng: ${c.paymentMethods.map((p) => PAYMENT_METHOD_LABEL[p]).join(", ")}`);
  }

  /* 6. Số ghế & quãng đường */
  if (c.minSeats != null && ctx.seats != null && ctx.seats < c.minSeats) {
    return fail(`Voucher yêu cầu tối thiểu ${c.minSeats} ghế`);
  }
  if (c.minDistanceKm != null && ctx.distanceKm != null && ctx.distanceKm < c.minDistanceKm) {
    return fail(`Voucher yêu cầu quãng đường tối thiểu ${c.minDistanceKm} km`);
  }
  if (c.maxDistanceKm != null && ctx.distanceKm != null && ctx.distanceKm > c.maxDistanceKm) {
    return fail(`Voucher chỉ áp dụng cho quãng đường đến ${c.maxDistanceKm} km`);
  }

  /* 7. Khu vực */
  if (c.originProvinces.length && ctx.originProvince && !includesCI(c.originProvinces, ctx.originProvince)) {
    return fail(`Voucher chỉ áp dụng khi điểm đón thuộc: ${c.originProvinces.join(", ")}`);
  }
  if (c.destProvinces.length && ctx.destProvince && !includesCI(c.destProvinces, ctx.destProvince)) {
    return fail(`Voucher chỉ áp dụng khi điểm đến thuộc: ${c.destProvinces.join(", ")}`);
  }

  /* 8. Khung thời gian trong tuần / trong ngày */
  if (c.daysOfWeek.length && !c.daysOfWeek.includes(ctx.now.getDay())) {
    return fail(`Voucher chỉ áp dụng vào: ${c.daysOfWeek.map((d) => DOW_LABEL[d]).join(", ")}`);
  }
  if (c.activeFromHour != null && c.activeToHour != null) {
    const h = ctx.now.getHours();
    const inWindow =
      c.activeFromHour <= c.activeToHour
        ? h >= c.activeFromHour && h < c.activeToHour
        : h >= c.activeFromHour || h < c.activeToHour; // khung qua nửa đêm
    if (!inWindow) return fail(`Voucher chỉ áp dụng từ ${c.activeFromHour}h đến ${c.activeToHour}h`);
  }

  /* 9. Tính giảm giá (có trừ trần ngân sách còn lại nếu có) */
  let discount = computeDiscount(core, ctx.orderValue);
  if (c.totalBudget != null) {
    const remaining = Math.max(0, c.totalBudget - ctx.budgetSpent);
    discount = Math.min(discount, remaining);
  }
  if (discount <= 0) return fail("Voucher không tạo ra giá trị giảm cho đơn này");

  return { ok: true, discount, finalPrice: Math.max(0, ctx.orderValue - discount) };
}

function fail(reason: string): EvalResult {
  return { ok: false, reason };
}

/* ─── Tiện ích ───────────────────────────────────────────────────────────── */

/** Trích tỉnh/thành (đoạn cuối) từ chuỗi địa chỉ kiểu Việt Nam. Heuristic, không bắt buộc chính xác tuyệt đối. */
export function extractProvince(address?: string | null): string | undefined {
  if (!address) return undefined;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : undefined;
}

/** Sinh danh sách nhãn tiếng Việt tóm tắt điều kiện — dùng cho chip/tag trên UI. */
export function summarizeConditions(core: Pick<VoucherCore, "minOrderValue" | "userLimit">, raw: unknown): string[] {
  const c = parseConditions(raw);
  const tags: string[] = [];

  if (c.audience !== "ALL") tags.push(AUDIENCE_LABEL[c.audience]);
  if (c.firstOrderOnly) tags.push("Chuyến đầu tiên");
  if (c.minUserTrips != null) tags.push(`≥ ${c.minUserTrips} chuyến`);

  if (core.minOrderValue > 0) tags.push(`Đơn từ ${fmtMoney(core.minOrderValue)}`);
  if (c.maxOrderValue != null) tags.push(`Đơn đến ${fmtMoney(c.maxOrderValue)}`);

  if (c.services.length) tags.push(c.services.map((s) => SERVICE_LABEL[s]).join(" / "));
  if (c.bookingModes.length) tags.push(c.bookingModes.map((m) => BOOKING_MODE_LABEL[m]).join(" / "));
  if (c.paymentMethods.length) tags.push(c.paymentMethods.map((p) => PAYMENT_METHOD_LABEL[p]).join(" / "));

  if (c.minSeats != null) tags.push(`≥ ${c.minSeats} ghế`);
  if (c.minDistanceKm != null || c.maxDistanceKm != null) {
    tags.push(`${c.minDistanceKm ?? 0}–${c.maxDistanceKm ?? "∞"} km`);
  }
  if (c.originProvinces.length || c.destProvinces.length) {
    tags.push(`${c.originProvinces.join("/") || "mọi nơi"} → ${c.destProvinces.join("/") || "mọi nơi"}`);
  }
  if (c.daysOfWeek.length) tags.push(c.daysOfWeek.map((d) => DOW_LABEL[d]).join(", "));
  if (c.activeFromHour != null && c.activeToHour != null) tags.push(`${c.activeFromHour}h–${c.activeToHour}h`);

  if (c.userDailyLimit != null) tags.push(`${c.userDailyLimit} lần/ngày`);
  if (core.userLimit > 1) tags.push(`${core.userLimit} lần/người`);
  if (c.totalBudget != null) tags.push(`Ngân sách ${fmtMoney(c.totalBudget)}`);
  if (c.stackable) tags.push("Có thể cộng dồn");
  if (c.autoApply) tags.push("Tự động áp dụng");

  return tags;
}
