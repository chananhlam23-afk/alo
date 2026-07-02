import { NextRequest } from "next/server";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

/** GET /api/v1/messages/conversations — danh sách cuộc trò chuyện của user */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const userId = auth.payload.userId;

  // Find all trips the user is part of (as customer or driver)
  const driverProfile = await prisma.driverProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  const trips = await prisma.trip.findMany({
    where: {
      messages: { some: {} }, // only trips with at least one message
      OR: [
        { passengers: { some: { customerId: userId } } },
        ...(driverProfile ? [{ driverProfileId: driverProfile.id }] : []),
      ],
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      driverProfile: {
        select: {
          userId: true,
          user: { select: { id: true, fullName: true, avatarUrl: true } },
          vehiclePlate: true,
          vehicleType: true,
        },
      },
      passengers: {
        select: {
          customerId: true,
          request: {
            select: {
              customer: { select: { id: true, fullName: true, avatarUrl: true } },
              pickupAddress: true,
              dropoffAddress: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true, content: true, type: true, createdAt: true,
          senderId: true,
          readAt: true,
          sender: { select: { fullName: true } },
        },
      },
      _count: {
        select: {
          messages: {
            where: { senderId: { not: userId }, readAt: null },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const conversations = trips.map((trip) => {
    const isDriver   = driverProfile ? trip.driverProfile.userId === userId : false;
    const otherUser  = isDriver
      ? trip.passengers[0]?.request?.customer
      : trip.driverProfile.user;

    const lastMsg    = trip.messages[0] ?? null;
    const unread     = trip._count.messages;

    return {
      tripId:   trip.id,
      tripStatus: trip.status,
      isDriver,
      otherUser,
      lastMessage: lastMsg,
      unreadCount: unread,
      pickup:  trip.passengers[0]?.request?.pickupAddress,
      dropoff: trip.passengers[0]?.request?.dropoffAddress,
    };
  });

  return ok({ conversations });
}
