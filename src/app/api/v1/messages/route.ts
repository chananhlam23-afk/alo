import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { broadcastToTrip } from "@/lib/supabase/realtime";

const GetSchema = z.object({
  tripId: z.string().min(1),
  before: z.string().optional(),
  limit:  z.coerce.number().int().min(1).max(100).default(50),
});

const PostSchema = z.object({
  tripId:   z.string().min(1),
  type:     z.enum(["TEXT", "LOCATION"]).default("TEXT"),
  content:  z.string().min(1).max(2000),
  metadata: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

async function verifyTripAccess(tripId: string, userId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      driverProfile: { select: { userId: true } },
      passengers:    { select: { customerId: true } },
    },
  });
  if (!trip) return null;

  const isDriver   = trip.driverProfile.userId === userId;
  const isPassenger = trip.passengers.some((p) => p.customerId === userId);
  return (isDriver || isPassenger) ? trip : null;
}

/** GET /api/v1/messages?tripId=xxx — load messages for a trip */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = GetSchema.safeParse(params);
    if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

    const { tripId, before, limit } = parsed.data;

    const access = await verifyTripAccess(tripId, auth.payload.userId);
    if (!access) return Errors.forbidden("Không có quyền truy cập cuộc trò chuyện này");

    const messages = await prisma.message.findMany({
      where: {
        tripId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    // Mark unread messages as read
    await prisma.message.updateMany({
      where: { tripId, senderId: { not: auth.payload.userId }, readAt: null },
      data:  { readAt: new Date() },
    }).catch(() => {});

    return ok({ messages, currentUserId: auth.payload.userId });
  } catch (err) {
    console.error("[messages GET]", err);
    return Errors.internal("Không thể tải tin nhắn");
  }
}

/** POST /api/v1/messages — send a message */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

    const { tripId, type, content, metadata } = parsed.data;

    const access = await verifyTripAccess(tripId, auth.payload.userId);
    if (!access) return Errors.forbidden("Không có quyền gửi tin nhắn vào chuyến này");

    const message = await prisma.message.create({
      data: {
        tripId,
        senderId: auth.payload.userId,
        type,
        content,
        metadata: metadata ?? undefined,
      },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
      },
    });

    // Broadcast to all trip participants via Supabase Realtime (fire-and-forget)
    broadcastToTrip(tripId, "chat.message", { message }).catch(() => {});

    return ok({ message });
  } catch (err) {
    console.error("[messages POST]", err);
    return Errors.internal("Không thể gửi tin nhắn");
  }
}
