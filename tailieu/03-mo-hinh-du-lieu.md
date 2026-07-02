# 03 — Mô hình dữ liệu (PostgreSQL / Supabase)

Quy ước: tên bảng & cột tiếng Anh snake_case; khóa chính `id uuid default gen_random_uuid()`; mọi bảng có `created_at timestamptz default now()` và `updated_at timestamptz`. Toạ độ lưu `lat double precision`, `lng double precision`; lộ trình/hành lang dùng PostGIS (`geometry`) nếu bật extension. Bật **Row Level Security (RLS)** cho mọi bảng (chính sách ở cuối file).

> Auth do **Supabase Auth** quản lý (`auth.users`). Bảng `profiles` mở rộng bằng `id` = `auth.users.id`.

## Enums

```sql
create type user_role        as enum ('customer','driver','admin');
create type driver_status    as enum ('pending_verification','verified','rejected','suspended');
create type vehicle_type     as enum ('car_4','car_7','van_16');
create type plate_color      as enum ('white','yellow');
create type ride_type        as enum ('private','pooled');
create type trip_direction   as enum ('outbound','return');
create type trip_status      as enum ('scheduled','matching','full','departed','in_transit','completed','cancelled');
create type booking_status   as enum ('pending','confirmed','driver_assigned','picked_up','in_transit','completed','cancelled');
create type payment_method   as enum ('cash','vnpay','momo','zalopay','wallet');
create type payment_status   as enum ('pending','paid','refunded','failed');
create type pricing_mode     as enum ('platform_pricing','htx_pricing');
create type wallet_txn_type  as enum ('credit','debit','escrow_hold','escrow_release','payout','commission','refund','bonus');
create type parcel_status    as enum ('created','matched','picked_up','in_transit','at_hub','out_for_delivery','delivered','cancelled');
create type dispute_status   as enum ('open','investigating','resolved','rejected');
```

## Bảng cốt lõi (Lớp 1 — MVP)

### profiles
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | = auth.users.id |
| role | user_role | mặc định 'customer' |
| full_name | text | |
| phone | text unique | |
| email | text | tùy chọn |
| avatar_url | text | |
| is_active | boolean | mặc định true |

### drivers
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | |
| profile_id | uuid FK → profiles | |
| status | driver_status | mặc định 'pending_verification' |
| license_number | text | giấy phép lái xe |
| license_image_url | text | |
| id_card_number | text | CCCD |
| id_card_image_url | text | |
| htx_id | uuid FK → cooperatives (nullable) | nếu thuộc HTX |
| rating_avg | numeric(2,1) | mặc định 0 |
| rating_count | int | mặc định 0 |
| backhaul_fill_rate | numeric(4,3) | thống kê, cập nhật định kỳ |
| verified_at | timestamptz | |

### vehicles
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | |
| driver_id | uuid FK → drivers | |
| type | vehicle_type | car_4 / car_7 / van_16 |
| seats | int | số chỗ phục vụ khách |
| plate_number | text | biển số |
| plate_color | plate_color | white/yellow — phục vụ kiểm tra pháp lý |
| phu_hieu_valid | boolean | có phù hiệu hợp lệ không (ràng buộc pháp lý) |
| brand_model | text | |
| photo_urls | text[] | |
| is_active | boolean | |

### cooperatives (HTX)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | |
| name | text | tên hợp tác xã |
| license_number | text | giấy phép kinh doanh vận tải |
| contact | jsonb | |

### routes
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | |
| name | text | vd "TP.HCM ↔ Vũng Tàu" |
| origin_name | text | |
| origin_lat / origin_lng | double | |
| dest_name | text | |
| dest_lat / dest_lng | double | |
| corridor_geom | geometry(LineString) | lộ trình tham chiếu (PostGIS) |
| distance_km | numeric | |
| duration_min | int | |
| is_active | boolean | |

### route_hubs (điểm đón/trả dọc tuyến)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | |
| route_id | uuid FK → routes | |
| name | text | |
| lat / lng | double | |
| order_index | int | thứ tự dọc tuyến |

### route_pricing
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | |
| route_id | uuid FK → routes | |
| vehicle_type | vehicle_type | |
| ride_type | ride_type | private/pooled |
| market_price | numeric | giá tham chiếu (toàn chuyến nếu private; mỗi ghế nếu pooled) |
| floor_price | numeric | giá sàn — không cho deal thấp hơn |
| surge_multiplier | numeric | hệ số cao điểm mặc định 1.0 |

### matching_config (tham số ghép theo tuyến — cấu hình được)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | |
| route_id | uuid FK → routes (nullable = mặc định toàn hệ thống) | |
| max_lateral_deviation_km | numeric | độ lệch ngang tối đa điểm đón/trả khỏi lộ trình |
| max_detour_minutes | int | ngân sách đi vòng (phút) |
| max_detour_km | numeric | ngân sách đi vòng (km) |
| time_window_minutes | int | cửa sổ thời gian ghép |
| min_seat_fill_to_depart | numeric | (tùy chọn) tỉ lệ lấp ghế tối thiểu để chốt chuyến |

### trips (chuyến do tài xế tạo / hệ thống sinh)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | |
| driver_id | uuid FK → drivers | |
| vehicle_id | uuid FK → vehicles | |
| route_id | uuid FK → routes | |
| direction | trip_direction | outbound/return |
| parent_trip_id | uuid FK → trips (nullable) | nối lượt đi ↔ chiều về |
| ride_type | ride_type | private/pooled |
| departure_time | timestamptz | giờ khởi hành dự kiến |
| seats_total | int | |
| seats_available | int | giảm dần khi có booking |
| base_price | numeric | giá tài xế/tuyến đặt (≥ floor_price) |
| status | trip_status | |
| current_lat / current_lng | double | vị trí realtime khi đang chạy |
| polyline | geometry(LineString) | lộ trình thực tế (có thể cập nhật khi ghép) |

### ride_requests (yêu cầu khi chưa có trip phù hợp)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | |
| customer_id | uuid FK → profiles | |
| origin_name / origin_lat / origin_lng | | điểm đón |
| dest_name / dest_lat / dest_lng | | điểm đến |
| desired_time | timestamptz | |
| pax | int | số khách |
| vehicle_pref | vehicle_type (nullable) | |
| ride_type | ride_type | |
| max_price | numeric (nullable) | đề nghị giá của khách (≥ floor_price) |
| status | text | 'open' / 'matched' / 'expired' |
| matched_trip_id | uuid FK → trips (nullable) | |

### bookings (đặt chỗ của khách trên một trip)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | |
| trip_id | uuid FK → trips | |
| customer_id | uuid FK → profiles | |
| ride_request_id | uuid FK → ride_requests (nullable) | |
| pickup_name / pickup_lat / pickup_lng | | điểm đón thực tế |
| dropoff_name / dropoff_lat / dropoff_lng | | điểm trả thực tế |
| seats | int | số ghế đặt |
| fare | numeric | tiền khách phải trả (sau chia tiền nếu pooled) |
| pickup_order | int | thứ tự đón trong chuyến ghép |
| dropoff_order | int | thứ tự trả |
| status | booking_status | |
| promo_code_id | uuid FK → promo_codes (nullable) | |
| e_contract_id | uuid FK → e_contracts (nullable) | hợp đồng điện tử |

### payments
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | |
| booking_id | uuid FK → bookings | |
| amount | numeric | |
| method | payment_method | |
| gateway_ref | text | mã giao dịch cổng thanh toán |
| status | payment_status | |
| paid_at | timestamptz | |

### ratings
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | |
| booking_id | uuid FK → bookings | |
| rater_id | uuid FK → profiles | |
| ratee_driver_id | uuid FK → drivers | |
| score | int (1..5) | |
| comment | text | |

### wallets & wallet_transactions
`wallets`: `id`, `driver_id` FK, `available_balance numeric default 0`, `escrow_balance numeric default 0`, `currency text default 'VND'`.

`wallet_transactions`: `id`, `wallet_id` FK, `type wallet_txn_type`, `amount numeric`, `balance_after numeric`, `ref_booking_id uuid (nullable)`, `note text`.

### payouts
`id`, `driver_id` FK, `amount numeric`, `status text` ('requested'/'approved'/'paid'/'rejected'), `bank_info jsonb`, `processed_at`.

### promo_codes
`id`, `code text unique`, `type text` ('percent'/'fixed'), `value numeric`, `max_uses int`, `used_count int`, `valid_from`, `valid_to`, `applies_to text` ('customer'/'driver').

### disputes
`id`, `booking_id` FK, `raised_by` FK profiles, `status dispute_status`, `description text`, `resolution text`, `resolved_at`.

### notifications
`id`, `user_id` FK profiles, `title text`, `body text`, `data jsonb`, `read_at timestamptz`.

### e_contracts (pháp lý — lưu hợp đồng điện tử)
`id`, `booking_id` FK, `content_snapshot jsonb` (giá, tuyến, các bên, điều khoản tại thời điểm đặt), `signed_at timestamptz`. **Giữ tối thiểu 2 năm theo Nghị định 10** (không xóa cứng; xem `05`).

## Bảng mở rộng — Lớp 2 (hàng) & Lớp 3 (chặng cuối)

### parcel_orders (P2)
`id`, `customer_id` FK, `trip_id` FK trips (nullable, ghép sau), `pickup_*`, `dropoff_*`, `weight_kg numeric`, `dimensions jsonb`, `receiver jsonb` (tên, SĐT), `fee numeric`, `status parcel_status`, `cod_amount numeric (nullable)`.

### shippers (P3)
`id`, `profile_id` FK, `area text`, `vehicle text` ('motorbike'), `status text`, `rating_avg numeric`.

### transfer_hubs (P3)
`id`, `name text`, `province text`, `lat/lng`, `contact jsonb`.

### last_mile_jobs (P3)
`id`, `parcel_order_id` FK, `shipper_id` FK (nullable), `hub_id` FK (nullable), `status text`, `assigned_at`, `delivered_at`.

## Quan hệ tóm tắt

```
profiles 1—1 drivers 1—* vehicles
drivers *—1 cooperatives
routes 1—* route_hubs / route_pricing / matching_config
drivers 1—* trips *—1 routes
trips 1—* bookings *—1 profiles(customer)
bookings 1—1 payments / e_contracts ; 1—* ratings
drivers 1—1 wallets 1—* wallet_transactions ; drivers 1—* payouts
trips 1—* parcel_orders (P2) ; parcel_orders 1—1 last_mile_jobs (P3)
```

## RLS (nguyên tắc)

- `customer`: chỉ đọc/sửa dữ liệu của chính mình (`bookings`, `ride_requests`, `ratings`, `payments`); đọc `trips`/`routes`/`route_pricing` công khai (đã `is_active`).
- `driver`: đọc/sửa `trips`/`vehicles`/`wallet` của chính mình; đọc `bookings` thuộc trip của mình; không đọc dữ liệu tài xế khác.
- `admin`: full access (qua service role hoặc policy theo `role='admin'`).
- Bảng tài chính (`wallets`, `wallet_transactions`, `payments`, `payouts`): chỉ ghi qua **server/RPC** (security definer), client không ghi trực tiếp.
