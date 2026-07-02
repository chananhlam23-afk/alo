import { createServiceClient } from "./client";

const supabase = createServiceClient();

export type RealtimeEvent =
  | "trip.current_stop"
  | "trip.stop_completed"
  | "driver.location"
  | "trip.status"
  | "match.offered"
  | "request.accepted"
  | "payment.required"
  | "payment.success"
  | "cargo.matched"
  | "trip.completed"
  | "chat.message"
  | "trip.started";

export async function broadcastToTrip(
  tripId: string,
  event: RealtimeEvent,
  payload: Record<string, unknown>,
) {
  if (!supabase) return;
  await supabase.channel(`trip:${tripId}`).send({ type: "broadcast", event, payload });
}

export async function broadcastToDriver(
  driverId: string,
  event: RealtimeEvent,
  payload: Record<string, unknown>,
) {
  if (!supabase) return;
  await supabase.channel(`driver:${driverId}`).send({ type: "broadcast", event, payload });
}

export async function broadcastToCustomer(
  customerId: string,
  event: RealtimeEvent,
  payload: Record<string, unknown>,
) {
  if (!supabase) return;
  await supabase.channel(`customer:${customerId}`).send({ type: "broadcast", event, payload });
}
