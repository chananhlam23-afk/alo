import { prisma } from "@/lib/db/prisma";
import type { PaymentGateway, PaymentStatus } from "@prisma/client";

export function createPayment(data: {
  tripId: string;
  customerId: string;
  amount: number;
  gateway: PaymentGateway;
  paymentUrl?: string;
}) {
  return prisma.payment.create({ data });
}

export function findPaymentById(id: string) {
  return prisma.payment.findUnique({ where: { id }, include: { trip: true } });
}

export function findPaymentByProviderRef(providerRef: string) {
  return prisma.payment.findFirst({ where: { providerRef } });
}

export function findPaymentsByTrip(tripId: string) {
  return prisma.payment.findMany({ where: { tripId }, orderBy: { createdAt: "desc" } });
}

export function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  extra?: { providerRef?: string; paidAt?: Date },
) {
  return prisma.payment.update({
    where: { id },
    data: { status, ...extra },
  });
}

export function markRefunded(id: string, refundAmount: number) {
  return prisma.payment.update({
    where: { id },
    data: { status: "REFUNDED", refundedAt: new Date(), refundAmount },
  });
}
