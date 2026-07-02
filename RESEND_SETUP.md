# Gửi OTP qua email thật (Resend) — Hướng dẫn hoàn tất

Tính năng gửi mã OTP về email **đã được lập trình xong** và đang chạy qua Resend:

- Đăng nhập bằng OTP email
- Đăng ký tài khoản (xác thực email)
- Quên mật khẩu (đặt lại qua OTP)

Code liên quan:
- Gửi mã: `src/app/api/v1/auth/email-otp/request/route.ts`
- Xác thực mã: `src/app/api/v1/auth/email-otp/verify/route.ts`
- Giao diện: `src/app/(auth)/login/_LoginForm.tsx`

API key Resend (`RESEND_API_KEY`) trong `.env.local` **đã hợp lệ**. Việc còn lại chỉ là **xác thực domain `thuanchuyen.com`** để gửi được tới email BẤT KỲ (không chỉ email chủ tài khoản Resend).

---

## Tại sao email chưa tới người dùng khác?

`EMAIL_FROM` hiện là `onboarding@resend.dev` — đây là địa chỉ "sandbox" của Resend:
Resend **chỉ cho gửi tới email của chủ tài khoản** (`trantuananhk4x6@gmail.com`).
Gửi tới bất kỳ email khác sẽ bị Resend từ chối.

Muốn gửi tới mọi người → phải **verify domain `thuanchuyen.com`** rồi đổi `EMAIL_FROM` sang domain đó.
(Domain đã được thêm vào Resend, đang ở trạng thái `pending` — Resend đang tự dò DNS.)

---

## Bước 1 — Thêm 3 bản ghi DNS cho domain `thuanchuyen.com`

Vào trang quản lý DNS của **nhà cung cấp tên miền `thuanchuyen.com`** (nơi bạn mua domain)
và thêm 3 record sau:

| # | Type | Name / Host           | Value                                                        | Ưu tiên (Priority) | TTL  |
|---|------|-----------------------|-------------------------------------------------------------|--------------------|------|
| 1 | TXT  | `resend._domainkey`   | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDKiotTFuduo6fezzq/7kzy9KbylodzdnqgUlfldkcyTQyQTQpWBFJVyDJugNiJ2+65JPVQX27QvE7xsExWUwOwTQ+Xs9UaonPXezhnDdZy+SiUcOvLyidXbafVzjwEpom57xafsIWEwJMra2c5Vjut85/Zfw8WXY7l9D95ldnrewIDAQAB` | — | Auto |
| 2 | MX   | `send`                | `feedback-smtp.ap-northeast-1.amazonses.com`                | `10`               | Auto |
| 3 | TXT  | `send`                | `v=spf1 include:amazonses.com ~all`                         | —                  | Auto |

> ⚠️ Lưu ý:
> - Một số nhà cung cấp yêu cầu nhập **tên đầy đủ**, ví dụ `resend._domainkey.thuanchuyen.com`
>   và `send.thuanchuyen.com` thay vì chỉ `resend._domainkey` / `send`.
> - Record #1 (DKIM) là **1 giá trị TXT dài duy nhất** — dán nguyên văn, không thêm dấu cách/xuống dòng.
> - Nếu ô Value bắt buộc có dấu ngoặc kép, dán dạng `"p=MIGf...rewIDAQAB"`.
> - Nếu domain đang trỏ về Cloudflare: tắt "proxy" (đám mây cam) cho các record này — để DNS only.

---

## Bước 2 — Chờ verify (tự động)

Sau khi thêm DNS (chờ 5–30 phút để lan truyền), Resend sẽ **tự** chuyển domain sang **Verified**.
Bạn cũng có thể vào https://resend.com/domains → chọn `thuanchuyen.com` → bấm **Verify** để kiểm tra ngay.

---

## Bước 3 — Đổi người gửi (mình sẽ làm giúp)

Sau khi domain verified, sửa `EMAIL_FROM` trong `.env.local`:

```env
# TRƯỚC (sandbox — chỉ gửi cho chủ tài khoản):
EMAIL_FROM="Thuận Chuyến <onboarding@resend.dev>"

# SAU (gửi cho mọi người):
EMAIL_FROM="Thuận Chuyến <no-reply@thuanchuyen.com>"
```

Rồi khởi động lại `npm run dev` (hoặc redeploy). Xong — hệ thống gửi OTP thật tới mọi email.

---

## Kiểm tra nhanh trước khi verify domain

Ngay bây giờ (chưa verify domain) bạn vẫn test được: đăng nhập bằng email
`trantuananhk4x6@gmail.com` → mã OTP sẽ tới hộp thư đó thật. Các email khác sẽ chưa nhận được
cho tới khi hoàn tất Bước 1–3.
