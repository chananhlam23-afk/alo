import { z } from "zod";
import { VoucherConditionsSchema } from "@/lib/vouchers/conditions";

export const RejectKycSchema = z.object({
  reason: z.string().min(10).max(500),
});

export const BlockUserSchema = z.object({
  reason: z.string().min(10).max(500),
});

export const UpdatePricingSchema = z.object({
  baseFare: z.number().int().min(0).optional(),
  commissionPct: z.number().min(0).max(1).optional(),
  costShareCapPct: z.number().min(0).max(1).optional(),
  holdDays: z.number().int().min(0).max(60).optional(),
  cargoPricing: z.record(z.unknown()).optional(),
  surgeRules: z.record(z.unknown()).optional(),
  perKmTiers: z.array(z.object({ upToKm: z.number(), pricePerKm: z.number().int() })).optional(),
});

export const CreateAreaPricingSchema = z.object({
  originProvince: z.string().min(2).max(100),
  destProvince: z.string().min(2).max(100),
  pricePerSeat: z.number().int().min(0).optional(),
  priceBand: z
    .object({ min: z.number().int().min(0), max: z.number().int().min(0) })
    .optional(),
  active: z.boolean().default(true),
});

export const UpdateAreaPricingSchema = z.object({
  pricePerSeat: z.number().int().min(0).optional(),
  priceBand: z
    .object({ min: z.number().int().min(0), max: z.number().int().min(0) })
    .optional(),
  active: z.boolean().optional(),
});

export const ApproveWithdrawalSchema = z.object({
  note: z.string().max(500).optional(),
});

export const RejectWithdrawalSchema = z.object({
  note: z.string().min(5).max(500),
});

export const ManualRefundSchema = z.object({
  amount: z.number().int().min(1),
  reason: z.string().min(5).max(500),
});

export const HandleReportSchema = z.object({
  status: z.enum(["INVESTIGATING", "RESOLVED", "DISMISSED"]),
  adminNote: z.string().max(1000).optional(),
});

export const UpdateCargoConfigSchema = z.object({
  enabled: z.boolean().optional(),
  maxWeightKg: z.number().min(0).max(100000).optional(),
  pricePerKg: z.number().int().min(0).optional(),
});

export const StatsExportSchema = z.object({
  type: z.enum(["trips", "earnings", "users", "withdrawals"]),
  from: z.string().datetime(),
  to: z.string().datetime(),
});

export const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  role: z.string().optional(),
  search: z.string().trim().max(100).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const CreateVoucherSchema = z
  .object({
    code: z.string().min(3).max(20).toUpperCase(),
    name: z.string().min(3).max(100),
    description: z.string().max(500).optional(),
    type: z.enum(["PERCENT", "FIXED_AMOUNT", "FREE_TRIP"]),
    value: z.number().min(0),
    minOrderValue: z.number().int().min(0).default(0),
    maxDiscount: z.number().int().min(0).optional(),
    usageLimit: z.number().int().min(1).optional(),
    userLimit: z.number().int().min(1).default(1),
    startsAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    targetRole: z.enum(["CUSTOMER", "DRIVER"]).optional(),
    conditions: VoucherConditionsSchema.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "PERCENT" && (v.value <= 0 || v.value > 100)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Phần trăm giảm phải nằm trong khoảng 1–100", path: ["value"] });
    }
    if (v.type !== "FREE_TRIP" && v.value <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Giá trị giảm phải lớn hơn 0", path: ["value"] });
    }
  });

export const UpdateVoucherSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  value: z.number().min(0).optional(),
  minOrderValue: z.number().int().min(0).optional(),
  maxDiscount: z.number().int().min(0).optional().nullable(),
  usageLimit: z.number().int().min(1).optional().nullable(),
  userLimit: z.number().int().min(1).optional(),
  targetRole: z.enum(["CUSTOMER", "DRIVER"]).optional().nullable(),
  expiresAt: z.string().datetime().optional(),
  conditions: VoucherConditionsSchema.optional(),
});

export const CreateBannerSchema = z.object({
  title: z.string().min(2).max(200),
  imageUrl: z.string().url(),
  linkUrl: z.string().url().optional(),
  position: z.enum(["HOME_TOP", "HOME_BOTTOM", "TRIP_LISTING", "BOOKING_CONFIRM"]),
  sortOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const UpdateBannerSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  imageUrl: z.string().url().optional(),
  linkUrl: z.string().url().optional().nullable(),
  position: z.enum(["HOME_TOP", "HOME_BOTTOM", "TRIP_LISTING", "BOOKING_CONFIRM"]).optional(),
  sortOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const CreateEventSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  imageUrl: z.string().url().optional(),
  type: z.enum(["CASHBACK", "DOUBLE_POINT", "DISCOUNT", "FREE_RIDE", "STREAK_BONUS", "REFERRAL"]),
  config: z.record(z.unknown()),
  targetAudience: z.enum(["ALL", "NEW_USER", "DRIVER", "CUSTOMER"]).default("ALL"),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  budget: z.number().int().min(0).optional(),
});

export const UpdateEventSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(2000).optional(),
  imageUrl: z.string().url().optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "ENDED"]).optional(),
  config: z.record(z.unknown()).optional(),
  endsAt: z.string().datetime().optional(),
  budget: z.number().int().min(0).optional().nullable(),
});

const BLOG_CATEGORIES = ["TIN_TUC", "KHUYEN_MAI", "HUONG_DAN", "CAU_CHUYEN", "THI_TRUONG"] as const;

export const CreateBlogPostSchema = z.object({
  slug:       z.string().min(3).max(120).regex(/^[a-z0-9-]+$/, "Slug chỉ gồm a-z, 0-9 và dấu gạch ngang"),
  title:      z.string().min(5).max(200),
  summary:    z.string().min(20).max(500),
  content:    z.string().min(50),
  coverImage: z.string().url().optional().nullable(),
  tags:       z.array(z.string().max(30)).max(10).default([]),
  category:   z.enum(BLOG_CATEGORIES).default("TIN_TUC"),
  seoTitle:   z.string().max(70).optional().nullable(),
  seoDesc:    z.string().max(160).optional().nullable(),
  readTime:   z.number().int().min(1).max(120).default(3),
  status:     z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
});

export const UpdateBlogPostSchema = CreateBlogPostSchema.partial();
