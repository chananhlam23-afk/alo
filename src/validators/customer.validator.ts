import { z } from "zod";

const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const QuoteSchema = z.object({
  pickup: GeoPointSchema,
  dropoff: GeoPointSchema,
  departureTime: z.string().datetime(),
  seats: z.number().int().min(1).max(9),
  type: z.enum(["CAR", "TRUCK"]).default("CAR"),
});

export const CreateTripRequestSchema = z.object({
  pickup: GeoPointSchema,
  pickupAddress: z.string().min(1).max(500),
  dropoff: GeoPointSchema,
  dropoffAddress: z.string().min(1).max(500),
  departureTime: z.string().datetime(),
  seats: z.number().int().min(1).max(9),
  passengerName: z.string().min(1).max(100),
  passengerPhone: z.string().min(9).max(12).regex(/^[0-9]+$/, "Số điện thoại chỉ gồm chữ số"),
  note: z.string().max(300).optional(),
  cargoWeightKg: z.number().min(0).max(10000).optional(),
  bookingMode: z.enum(["OPEN_WAIT", "DIRECT_BOOK"]).default("OPEN_WAIT"),
  targetDriverId: z.string().cuid().optional(),
  voucherCode: z.string().max(50).optional(),
});

export const CreatePaymentSchema = z.object({
  tripId: z.string().cuid(),
  gateway: z.enum(["PAYOS"]),
});

export const CreateRatingSchema = z.object({
  tripId: z.string().cuid(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const CreateReportSchema = z.object({
  tripId: z.string().cuid().optional(),
  reportedDriverId: z.string().cuid(),
  reason: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  evidenceUrls: z.array(z.string().url()).max(5).default([]),
});

export const ListTripsSchema = z.object({
  status: z.enum(["PENDING", "MATCHED", "CANCELLED", "EXPIRED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const FeedDriversSchema = z.object({
  pickupLat: z.coerce.number().min(-90).max(90),
  pickupLng: z.coerce.number().min(-180).max(180),
  dropoffLat: z.coerce.number().min(-90).max(90),
  dropoffLng: z.coerce.number().min(-180).max(180),
  departureTime: z.string().datetime(),
  seats: z.coerce.number().int().min(1).max(9).default(1),
});
