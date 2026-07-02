export type UserRole = "CUSTOMER" | "DRIVER" | "ADMIN";
export type VerificationStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";
export type TripRequestStatus = "PENDING" | "MATCHED" | "CANCELLED" | "EXPIRED";
export type BookingMode = "OPEN_WAIT" | "DIRECT_BOOK";
export type TripStatus = "PENDING" | "ACTIVE" | "ONGOING" | "COMPLETED" | "CANCELLED";
export type LegStatus = "WAITING" | "PICKED_UP" | "DROPPED" | "NO_SHOW" | "CANCELLED";
export type StopType = "PICKUP" | "DROPOFF";
export type StopStatus = "PENDING" | "DONE" | "SKIPPED";
export type MatchStatus = "OFFERED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type PaymentGateway = "PAYOS" | "WALLET";
export type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED" | "PROCESSING" | "DONE";
export type NotificationChannel = "EMAIL" | "ZALO" | "IN_APP" | "PUSH";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED";
export type ReportStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";
export type DocumentType =
  | "CCCD_FRONT"
  | "CCCD_BACK"
  | "VEHICLE_REGISTRATION"
  | "DRIVER_LICENSE"
  | "SELFIE";
export type RouteStatus = "ACTIVE" | "PAUSED" | "COMPLETED";
export type WalletTxType = "TRIP_CREDIT" | "WITHDRAWAL" | "ADJUSTMENT" | "RELEASE" | "REFUND";

export const NotificationEvent = {
  TRIP_REQUEST_CREATED: "TRIP_REQUEST_CREATED",
  CARGO_REQUEST_CREATED: "CARGO_REQUEST_CREATED",
  TRIP_ACCEPTED: "TRIP_ACCEPTED",
  DIRECT_BOOK_REQUESTED: "DIRECT_BOOK_REQUESTED",
  PAYMENT_SUCCESS: "PAYMENT_SUCCESS",
  TRIP_STARTED: "TRIP_STARTED",
  TRIP_COMPLETED: "TRIP_COMPLETED",
  WALLET_CREDIT: "WALLET_CREDIT",
  WITHDRAWAL_APPROVED: "WITHDRAWAL_APPROVED",
  WITHDRAWAL_REJECTED: "WITHDRAWAL_REJECTED",
  KYC_APPROVED: "KYC_APPROVED",
  KYC_REJECTED: "KYC_REJECTED",
  CARGO_MATCHED: "CARGO_MATCHED",
} as const;
export type NotificationEvent = (typeof NotificationEvent)[keyof typeof NotificationEvent];
