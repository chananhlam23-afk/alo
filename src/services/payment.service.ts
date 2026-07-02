import { createPayOSLink, verifyPayOSWebhook, type PayOSWebhookBody } from "@/lib/payments/payos";
import {
  createPayment,
  findPaymentByProviderRef,
  updatePaymentStatus,
} from "@/repositories/payment.repository";
import { updateTrip } from "@/repositories/trip.repository";
import { matchCargoToTrip } from "@/services/cargo.service";
import { broadcastToCustomer } from "@/lib/supabase/realtime";
import { notify } from "@/lib/notifications/notification.service";
import { findUserById } from "@/repositories/user.repository";

export async function initiatePayment(
  tripId: string,
  customerId: string,
  gateway: "PAYOS" | "WALLET",
  amount: number,
) {
  // Chưa có ví nội bộ cho khách → chỉ hỗ trợ PayOS, không giả lập "đã thanh toán".
  if (gateway !== "PAYOS") throw new Error("Phương thức thanh toán chưa được hỗ trợ");

  const payment = await createPayment({
    tripId,
    customerId,
    amount,
    gateway,
  });

  // PayOS: orderCode phải là số, dùng timestamp để đảm bảo unique
  const orderCode = Date.now();
  const providerRef = String(orderCode);
  const descMax25 = `Chuyen xe #${tripId.slice(-8)}`.slice(0, 25);
  const result = await createPayOSLink({ orderCode, amount, description: descMax25 });

  await updatePaymentStatus(payment.id, "PENDING", { providerRef });

  return { paymentId: payment.id, paymentUrl: result.checkoutUrl };
}

export async function handlePayOSWebhook(body: PayOSWebhookBody) {
  if (!verifyPayOSWebhook(body)) throw new Error("PayOS signature không hợp lệ");

  const { orderCode, amount } = body.data;
  const payment = await findPaymentByProviderRef(String(orderCode));
  if (!payment) throw new Error("Không tìm thấy thanh toán");

  // Idempotent: PayOS gửi lại webhook nhiều lần → đã PAID thì bỏ qua, không chạy lại side-effect.
  if (payment.status === "PAID") return;

  if (body.success && body.code === "00") {
    // KHÔNG ghi đè providerRef (là orderCode dùng để tra cứu khi PayOS retry).
    await updatePaymentStatus(payment.id, "PAID", { paidAt: new Date() });
    await onPaymentSuccess(payment.tripId, payment.customerId, amount);
  } else {
    await updatePaymentStatus(payment.id, "FAILED");
  }
}

async function onPaymentSuccess(tripId: string, customerId: string, amount: number) {
  await updateTrip(tripId, { status: "ACTIVE" });
  void matchCargoToTrip(tripId);
  await broadcastToCustomer(customerId, "payment.success", { tripId, paid: true });

  const user = await findUserById(customerId);
  if (user) {
    await notify({
      userId: customerId,
      phone: user.phone ?? undefined,
      email: user.email ?? undefined,
      event: "PAYMENT_SUCCESS",
      templateData: { amount: String(amount), providerRef: tripId },
    });
  }
}
