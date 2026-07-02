# 07 — Kiến trúc kỹ thuật

## 1. Tech stack

| Lớp | Công nghệ | Lý do |
|-----|-----------|-------|
| Frontend | Next.js 14+ (App Router), TypeScript | SSR/RSC, một codebase cho 3 vai trò, dễ deploy |
| UI | Tailwind CSS + shadcn/ui + lucide-react | nhanh, nhất quán, mobile-first |
| Data fetching/state | TanStack Query | cache, realtime-friendly |
| Form & validation | react-hook-form + zod | type-safe |
| Backend & DB | Supabase: PostgreSQL, Auth, Realtime, Storage, Edge Functions | trọn gói, realtime tracking, RLS, đã quen |
| Geo trong DB | PostGIS (extension Supabase) | lọc corridor, lệch tuyến nhanh |
| Bản đồ & định tuyến | Goong Maps API (autocomplete, directions, distance matrix); SDK Goong JS để render | tối ưu cho VN, chi phí thấp; có thể thay Google Maps |
| Thanh toán | VNPay / MoMo / ZaloPay qua webhook + ví nội bộ | phổ biến tại VN |
| Push/Realtime | Supabase Realtime (vị trí, trạng thái, gợi ý ghép); web push (tùy chọn) | |
| Deploy | Vercel (Next.js) + Supabase Cloud | |

**Web-first / PWA:** một ứng dụng Next.js, ba route group (`customer`/`driver`/`admin`) phân theo `role`. Có thể đóng gói thành app di động sau (Capacitor/PWA install). Tối ưu giao diện điện thoại trước vì cả tài xế lẫn khách dùng chủ yếu trên di động.

## 2. Cấu trúc thư mục đề xuất

```
thuanchuyen/
├─ app/
│  ├─ (auth)/login/
│  ├─ (customer)/            # /, search, booking, trips, history, profile, parcel
│  ├─ (driver)/driver/       # dashboard, onboarding, routes, trips, matches, wallet
│  ├─ (admin)/admin/         # dashboard, drivers, routes, pricing, matching-config, finance, disputes
│  └─ api/                   # route handlers (hoặc dùng Edge Functions)
│     ├─ auth/ trips/ bookings/ ride-requests/ driver/ admin/ webhooks/ places/
├─ components/               # shared UI (AddressAutocomplete, RouteMap, ...)
├─ lib/
│  ├─ supabase/              # client, server, types (generated)
│  ├─ goong/                 # wrapper directions/autocomplete/distance
│  ├─ matching/              # corridor, detour, ranking, fare-split, backhaul
│  ├─ pricing/               # tính giá, surge, clamp floor
│  ├─ payments/              # vnpay/momo/zalopay adapters
│  └─ wallet/                # bút toán ví (gọi RPC)
├─ supabase/
│  ├─ migrations/            # SQL schema (enums, tables, RLS)
│  ├─ functions/             # Edge Functions: matching-job, backhaul, payment-webhook
│  └─ seed/                  # dữ liệu mẫu: 1-2 tuyến (HCM–Vũng Tàu, HCM–Đồng Nai)
├─ types/
└─ README (trỏ về bộ docs này)
```

## 3. Tích hợp Goong (gợi ý)

- `lib/goong/autocomplete(query)` → Place Autocomplete (cho `AddressAutocompleteInput`).
- `lib/goong/directions(origin, dest, waypoints[])` → lấy `distance_km`, `duration_min`, polyline (dùng trong `canPool` và hiển thị).
- `lib/goong/distanceMatrix(points[])` → tính nhanh khoảng cách nhiều điểm (tối ưu thứ tự đón/trả).
- **Cache** kết quả theo cặp/điểm để giảm số lần gọi (quota + chi phí). Chỉ gọi directions cho top-N kết quả khi ranking.

## 4. Realtime

- Channel theo `trip_id`: tài xế đẩy vị trí (`/api/driver/location`) → khách subscribe để hiển thị bản đồ + ETA.
- Channel theo `driver_id`: đẩy gợi ý ghép/booking mới → tài xế nhận tức thì.
- Bảng `notifications` cho thông báo lưu lại.

## 5. Bảo mật & RLS

- RLS bật mọi bảng (xem `03`). Client dùng `anon`/`authenticated`; thao tác nhạy cảm (ví, ghép, duyệt) qua **Edge Function/RPC service role**.
- Webhook thanh toán: verify chữ ký, xử lý idempotent theo `gateway_ref`.
- Không để secret/khóa API ở client (Goong server key, payment secret nằm ở server/env).

## 6. Biến môi trường (.env)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # chỉ dùng server-side
GOONG_API_KEY=                    # server (directions, distance matrix)
NEXT_PUBLIC_GOONG_MAPTILES_KEY=   # render bản đồ phía client
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=
ZALOPAY_APP_ID=
ZALOPAY_KEY1=
ZALOPAY_KEY2=
APP_BASE_URL=
```

## 7. Lưu ý hiệu năng

- Lọc corridor/thời gian/ghế ở DB (PostGIS + index trên `departure_time`, `route_id`, `status`).
- Chỉ gọi Goong Directions cho số ít ứng viên tốt nhất sau khi lọc DB.
- Index gợi ý: `trips(route_id, departure_time, status)`, `bookings(trip_id)`, `ride_requests(status, desired_time)`, GIST index trên cột `geometry`.
