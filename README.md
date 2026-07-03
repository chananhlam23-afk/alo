# Thuận Chuyến — Webapp Ghép Chuyến Xe Liên Tỉnh

Next.js 14 + Supabase (PostgreSQL + PostGIS + Realtime) + Prisma ORM

---update


## Kiến trúc

```
src/
├── app/
│   ├── (auth)/login/          # Trang đăng nhập OTP
│   ├── (dashboard)/
│   │   ├── admin/             # Admin panel
│   │   ├── driver/            # Dashboard tài xế
│   │   └── customer/          # Đặt chuyến & theo dõi
│   └── api/v1/                # 60+ REST Route Handlers
│       ├── auth/              # OTP + JWT refresh
│       ├── customer/          # Quote, Feed, Trips, Payments
│       ├── driver/            # KYC, Routes, Matches, Trips, Wallet
│       ├── admin/             # Dashboard, Drivers, Pricing, Reports
│       ├── webhooks/          # VNPay + MoMo callback
│       ├── cron/              # Giải phóng ví (Vercel Cron)
│       └── storage/           # Supabase Storage signed URLs
├── lib/
│   ├── auth/                  # JWT (15m access + 7d refresh)
│   ├── security/              # Rate limit (Upstash Redis)
│   ├── supabase/              # Client + Realtime + Storage
│   ├── goong/                 # Directions + Distance Matrix
│   ├── notifications/         # Email (nodemailer) + Zalo ZNS
│   ├── payments/              # VNPay (HMAC-SHA512) + MoMo (HMAC-SHA256)
│   ├── routing/               # Heuristic + brute-force TSP optimizer
│   └── sms/                   # SMS provider (ESMS / console)
├── repositories/              # Data Access Layer
├── services/                  # Business Logic Layer
├── validators/                # Zod input validation
└── hooks/                     # React hooks (useAuth)
```

---

## Setup

### 1. Clone & cài dependencies

```bash
cd thuanduong
npm install
```

### 2. Tạo Supabase project

1. Vào [supabase.com](https://supabase.com) → New project
2. **Settings → Database → Extensions** → Enable `postgis`
3. **Settings → API** → Lấy `URL`, `anon key`, `service role key`

### 3. Cấu hình biến môi trường

```bash
cp .env.example .env.local
```

Điền tất cả các giá trị trong `.env.local`:

| Biến | Mô tả |
|---|---|
| `DATABASE_URL` | PostgreSQL URL từ Supabase |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server only) |
| `JWT_ACCESS_SECRET` | Chuỗi ngẫu nhiên ≥ 32 ký tự |
| `JWT_REFRESH_SECRET` | Chuỗi ngẫu nhiên ≥ 32 ký tự khác |
| `GOONG_API_KEY` | [goong.io](https://goong.io) API key |
| `UPSTASH_REDIS_REST_URL` | [upstash.com](https://upstash.com) Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Gmail SMTP hoặc Resend |
| `ZALO_OA_ACCESS_TOKEN` | Zalo OA token (dùng cho ZNS) |
| `VNPAY_TMN_CODE` / `VNPAY_HASH_SECRET` | VNPay credentials |
| `MOMO_PARTNER_CODE` / `MOMO_ACCESS_KEY` / `MOMO_SECRET_KEY` | MoMo credentials |
| `CRON_SECRET` | Bảo vệ endpoint cron |

### 4. Migrate & seed database

```bash
# Push schema lên Supabase
npm run db:push

# Seed dữ liệu ban đầu (admin, pricing, area pricing)
npm run db:seed
```

### 5. Tạo Supabase Storage buckets

Trong Supabase Dashboard → Storage → New bucket:
- `kyc-documents` (private)
- `avatars` (public)

### 6. Chạy dev

```bash
npm run dev
```

Truy cập:
- `http://localhost:3000/login` — Đăng nhập OTP
- `http://localhost:3000/admin` — Admin panel
- `http://localhost:3000/driver` — Dashboard tài xế
- `http://localhost:3000/customer` — Đặt chuyến

---

## Deploy lên Vercel

```bash
vercel deploy
```

Thêm tất cả biến môi trường vào Vercel Dashboard → Settings → Environment Variables.

Vercel Cron tự kích hoạt `POST /api/v1/cron/release-wallet` mỗi giờ (khai báo trong `vercel.json`).

---

## API Documentation

Base URL: `/api/v1`

Auth: `Authorization: Bearer <access_token>`

Response format:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "VALIDATION", "message": "..." } }
```

Xem chi tiết spec trong `D:\ghepchuyen\THUAN_DUONG_API_VA_NANG_CAO.md`.

---

## Tính năng bảo mật

| Tính năng | Chi tiết |
|---|---|
| Authentication | JWT HS256, access 15 phút, refresh 7 ngày |
| OTP rate limit | 5 lần/giờ/SĐT (Upstash Redis sliding window) |
| API rate limit | 100 req/phút/user |
| Input validation | Zod trên mọi endpoint |
| SQL injection | Prisma parameterized queries |
| Webhook verification | HMAC-SHA512 (VNPay) / HMAC-SHA256 (MoMo) |
| KYC images | Supabase Storage private bucket + signed URLs |
| Cron protection | `x-cron-secret` header |
| Security headers | CSP, HSTS, X-Frame-Options, Referrer-Policy |
| CORS | Chỉ cho phép origin từ `NEXT_PUBLIC_APP_URL` |

---

## Biến môi trường tuỳ chọn

| Biến | Mặc định | Mô tả |
|---|---|---|
| `USE_ROUTE_OPTIMIZER` | `false` | Bật TSP optimizer (tốn Goong API calls) |
| `SMS_PROVIDER` | console | `esms` để gửi SMS thật |
| `ESMS_API_KEY` | — | ESMS API key |
| `WALLET_HOLD_DAYS` | 3 | Số ngày giữ tiền trước khi giải phóng |
