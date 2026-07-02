import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export function createManyStops(stops: Prisma.TripStopCreateManyInput[]) {
  return prisma.tripStop.createMany({ data: stops });
}

export function findStopsByTrip(tripId: string) {
  return prisma.tripStop.findMany({
    where: { tripId },
    orderBy: { order: "asc" },
  });
}

export function findStopById(id: string) {
  return prisma.tripStop.findUnique({ where: { id } });
}

export function markStopDone(id: string) {
  return prisma.tripStop.update({
    where: { id },
    data: { status: "DONE", doneAt: new Date() },
  });
}

export function markStopSkipped(id: string) {
  return prisma.tripStop.update({
    where: { id },
    data: { status: "SKIPPED" },
  });
}

export function deleteStopsByTrip(tripId: string) {
  return prisma.tripStop.deleteMany({ where: { tripId } });
}
