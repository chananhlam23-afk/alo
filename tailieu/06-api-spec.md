# 06 — Đặc tả API (REST)

Quy ước: base `/api`; trả JSON; xác thực bằng Supabase JWT (header `Authorization: Bearer <token>`); phân quyền theo `role`. Có thể triển khai bằng Next.js Route Handlers hoặc Supabase Edge Functions; thao tác tài chính/ghép dùng RPC/Edge Function (server-side).

Định dạng lỗi chung:
```json
{ "error": { "code": "STRING_CODE", "message": "Mô tả" } }
```

## Auth

| Method | Path | Mô tả | Body / Ghi chú |
|--------|------|-------|----------------|
| POST | `/api/auth/otp/request` | Gửi OTP | `{ phone }` |
| POST | `/api/auth/otp/verify` | Xác thực OTP, trả session | `{ phone, code }` |
| GET | `/api/me` | Hồ sơ hiện tại | |
| PATCH | `/api/me` | Cập nhật hồ sơ | `{ full_name?, email?, avatar_url? }` |

## Khách — tìm & đặt chuyến

| Method | Path | Mô tả | Body / Ghi chú |
|--------|------|-------|----------------|
| GET | `/api/places/autocomplete?q=` | Gợi ý địa chỉ (proxy Goong) | trả `[{place_id, description, lat, lng}]` |
| POST | `/api/trips/search` | Tìm chuyến khớp | `{ origin{lat,lng}, dest{lat,lng}, desired_time, pax, vehicle_pref?, ride_type }` → danh sách trip đã xếp hạng + giá |
| POST | `/api/ride-requests` | Tạo yêu cầu khi chưa có chuyến | như trên + `max_price?` |
| POST | `/api/bookings` | Đặt chỗ trên một trip | `{ trip_id, pickup{}, dropoff{}, seats, proposed_price?, promo_code? }` → tạo booking `pending` + e_contract |
| GET | `/api/bookings/:id` | Chi tiết booking | |
| POST | `/api/bookings/:id/cancel` | Hủy (áp dụng chính sách) | tính `cancel_fee` theo BR-3 |
| GET | `/api/trips/:id/track` | Vị trí + ETA realtime | (hoặc subscribe Realtime channel) |
| POST | `/api/bookings/:id/pay` | Thanh toán | `{ method }` → khởi tạo giao dịch cổng hoặc đánh dấu cash |
| POST | `/api/bookings/:id/rate` | Đánh giá | `{ score, comment? }` |
| GET | `/api/me/trips?status=` | Lịch sử chuyến | |

## Tài xế

| Method | Path | Mô tả | Body / Ghi chú |
|--------|------|-------|----------------|
| POST | `/api/driver/onboarding` | Nộp hồ sơ KYC | giấy tờ, xe |
| GET | `/api/driver/me` | Hồ sơ tài xế + trạng thái xác minh | |
| POST | `/api/driver/routes` | Đăng ký tuyến + khung giờ | `{ route_id, time_slots[], auto_post? }` |
| POST | `/api/driver/trips` | Tạo trip | `{ route_id, direction, vehicle_id, departure_time, seats_total, ride_type, base_price }` |
| GET | `/api/driver/trips` | Danh sách trip của tôi | |
| GET | `/api/driver/trips/:id/passengers` | Khách ghép + thứ tự đón/trả | |
| GET | `/api/driver/matches` | Khách được gợi ý (đi + chiều về) | trả kèm điểm xếp hạng |
| POST | `/api/driver/matches/:requestId/accept` | Nhận một khách/booking | tạo/ghép booking, cập nhật seats |
| POST | `/api/driver/matches/:requestId/decline` | Từ chối | |
| POST | `/api/driver/trips/:id/status` | Cập nhật trạng thái chuyến | `{ status }` |
| POST | `/api/driver/location` | Cập nhật vị trí realtime | `{ trip_id, lat, lng }` (đẩy lên Realtime) |
| GET | `/api/driver/wallet` | Số dư + giao dịch | |
| POST | `/api/driver/payouts` | Yêu cầu rút tiền | `{ amount, bank_info }` |

## Admin

| Method | Path | Mô tả |
|--------|------|-------|
| GET/POST/PATCH | `/api/admin/drivers` (+ `/:id/verify`, `/:id/suspend`) | Quản lý & duyệt tài xế |
| GET/POST/PATCH | `/api/admin/routes` (+ `/:id/hubs`) | Quản lý tuyến & điểm đón/trả |
| GET/POST/PATCH | `/api/admin/pricing` | market/floor price, surge, pricing_mode |
| GET/PATCH | `/api/admin/matching-config` | Tham số ghép theo tuyến |
| GET | `/api/admin/finance/transactions` | Giao dịch & ví |
| POST | `/api/admin/finance/payouts/:id/approve` | Duyệt rút tiền |
| GET | `/api/admin/metrics` | KPI dashboard (seat fill, backhaul rate, dead mileage, GMV, take rate, wait time, cancel rate) |
| GET/PATCH | `/api/admin/disputes` | Khiếu nại |
| POST | `/api/admin/promotions` | Mã giảm/thưởng |

## Webhooks thanh toán

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/webhooks/vnpay` | Nhận kết quả thanh toán VNPay (verify chữ ký) |
| POST | `/api/webhooks/momo` | Nhận kết quả MoMo |
| POST | `/api/webhooks/zalopay` | Nhận kết quả ZaloPay |

> Mỗi webhook phải xác thực chữ ký, cập nhật `payments.status`, ghi `wallet_transactions` tương ứng (idempotent theo `gateway_ref`).

## Lớp 2/3 (P2/P3 — phác thảo)

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/parcels` | Tạo đơn hàng nhỏ, hệ thống ghép vào trip cùng tuyến |
| GET | `/api/parcels/:id/track` | Theo dõi đơn |
| POST | `/api/driver/parcels/:id/confirm` | Tài xế xác nhận nhận/giao hàng |
| POST | `/api/admin/last-mile/assign` | Gán shipper/điểm trung chuyển |
