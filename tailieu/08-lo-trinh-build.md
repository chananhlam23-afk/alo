# 08 — Lộ trình build (cho AI coding agent)

Xây theo thứ tự. Mỗi milestone hoàn thành rồi mới sang milestone sau. **MVP = Lớp 1 (chở người).** Lớp 2/3 chỉ làm sau khi MVP chạy ổn.

## Nguyên tắc làm việc cho AI

1. Làm theo từng milestone; sau mỗi milestone, đảm bảo app build được và luồng chính chạy được.
2. Sinh schema từ `03`, logic ghép từ `04`, luật từ `05`, API từ `06`, kiến trúc/thư mục từ `07`.
3. Tham số ghép/giá/hủy lấy từ DB (`matching_config`, `route_pricing`), **không hard-code**.
4. Tôn trọng ràng buộc pháp lý ở `05` mục 6 (xác minh tài xế, chế độ định giá, hợp đồng điện tử, lưu trữ ≥2 năm) — đặt sau cờ `compliance_mode`.
5. Việc nào chưa rõ → giải pháp đơn giản nhất + để `// TODO:` kèm câu hỏi, không tự suy diễn mở rộng.

---

## Milestone 0 — Khởi tạo dự án
- [ ] Tạo Next.js (App Router, TS, Tailwind) + cài shadcn/ui, TanStack Query, react-hook-form, zod.
- [ ] Kết nối Supabase (client/server), tạo `lib/supabase`.
- [ ] Cấu trúc thư mục theo `07`. Thiết lập `.env` mẫu.
- [ ] Bật PostGIS trong Supabase.

## Milestone 1 — Auth & vai trò
- [ ] Đăng nhập OTP qua SĐT (Supabase Auth phone).
- [ ] Bảng `profiles` + trigger tạo profile khi đăng ký; `role` mặc định `customer`.
- [ ] Điều hướng theo role vào 3 route group; middleware chặn truy cập trái quyền.
- [ ] Cho phép một tài khoản có hồ sơ khách + tài xế, chuyển vai trò.

## Milestone 2 — Schema & dữ liệu nền
- [ ] Viết migration: tất cả enum + bảng cốt lõi Lớp 1 (`03`).
- [ ] Bật RLS + policy cơ bản theo `03`.
- [ ] Seed 1–2 tuyến mẫu (HCM–Vũng Tàu, HCM–Đồng Nai) kèm `route_hubs`, `route_pricing`, `matching_config`.
- [ ] Sinh types từ Supabase.

## Milestone 3 — Tài xế: onboarding & xác minh
- [ ] Màn hình onboarding KYC (giấy tờ, xe) + upload Storage.
- [ ] Admin duyệt tài xế (verify/reject/suspend).
- [ ] Ràng buộc: chỉ tài xế `verified` + xe `phu_hieu_valid` mới tạo/nhận chuyến (BR-6.1).

## Milestone 4 — Tài xế: tuyến, khung giờ & tạo chuyến
- [ ] Đăng ký tuyến + khung giờ; "đăng chuyến tự động".
- [ ] Tạo `trip` (outbound) với giá trong khung (≥ floor_price) hoặc theo `htx_pricing`.
- [ ] Danh sách trip của tài xế.

## Milestone 5 — Khách: tìm & đặt chuyến (lõi)
- [ ] `AddressAutocompleteInput` (Goong) + form đặt chuyến.
- [ ] `/api/trips/search`: lọc corridor + thời gian + ghế ở DB (PostGIS), rồi tính detour + ranking (`04`).
- [ ] Hiển thị giá `private` vs `pooled`, gửi deal (chặn dưới floor_price).
- [ ] Tạo `booking` + `e_contract`; nếu không có chuyến → `ride_request`.

## Milestone 6 — Engine ghép & chiều quay đầu
- [ ] Hàm `canPool` (lệch ngang + ngân sách đi vòng) dùng PostGIS + Goong (`04` mục 3).
- [ ] Ranking kết quả; thứ tự đón/trả.
- [ ] Matching nền (Edge Function/cron) khi có trip/request mới.
- [ ] Backhaul: khi nhận trip outbound → tìm + gợi ý khách chiều về; tạo trip return nối `parent_trip_id`.
- [ ] Chia tiền `pooled` (chiến lược `hybrid` mặc định, cấu hình được).

## Milestone 7 — Thực thi chuyến & realtime
- [ ] Tài xế nhận/từ chối gợi ý; cập nhật `seats_available`.
- [ ] Cập nhật vị trí realtime + trạng thái chuyến; khách theo dõi bản đồ + ETA.
- [ ] Chia sẻ hành trình + nút SOS.

## Milestone 8 — Thanh toán & ví
- [ ] Tích hợp ít nhất 1 cổng (VNPay) + `cash`; webhook idempotent.
- [ ] Ví tài xế 2 lớp + `wallet_transactions`; bút toán qua RPC server-side (BR-4).
- [ ] Hoa hồng/phí nền tảng; `payout_request` + admin duyệt.
- [ ] Biên nhận điện tử.

## Milestone 9 — Đánh giá, hủy, khuyến mãi
- [ ] Đánh giá 2 chiều, cập nhật điểm tài xế.
- [ ] Hủy chuyến theo chính sách (BR-3) + phí hủy qua escrow.
- [ ] Mã giảm giá / thưởng / referral.

## Milestone 10 — Admin dashboard & KPI
- [ ] Quản lý tuyến/giá/cấu hình ghép.
- [ ] Tài chính: giao dịch, ví, duyệt rút tiền, đối soát.
- [ ] KPI: tỉ lệ lấp ghế, tỉ lệ quay đầu có khách, dead mileage %, GMV, take rate, thời gian chờ ghép, tỉ lệ hủy.
- [ ] Khiếu nại; thông báo.

## Milestone 11 — Tuân thủ & hoàn thiện
- [ ] Hợp đồng điện tử + lưu trữ ≥2 năm (soft-delete) (BR-6.3/6.4).
- [ ] Cờ `compliance_mode`, chế độ `htx_pricing`, liên kết HTX.
- [ ] PWA (cài đặt, offline cơ bản), tối ưu mobile, kiểm thử luồng chính.

---

## PHASE 2 — Lớp hàng (sau khi MVP chạy ổn)
- [ ] `parcel_orders`; ghép hàng vào trip cùng tuyến (mở rộng engine cho khoang hàng).
- [ ] Phí vận chuyển hàng; tài xế xác nhận nhận/giao.
- [ ] Đặt khứ hồi cho khách (hỗ trợ backhaul).

## PHASE 3 — Chặng cuối (last-mile)
- [ ] `shippers`, `transfer_hubs`, `last_mile_jobs`.
- [ ] Gán shipper/điểm trung chuyển; theo dõi giao tận tay; COD.

---

## Định nghĩa "xong" cho MVP (Definition of Done)

Một khách có thể: đăng nhập → tìm chuyến ghép HCM–Vũng Tàu → thấy giá minh bạch → đặt → được ghép vào trip của một tài xế đã xác minh → theo dõi realtime → thanh toán → đánh giá. Một tài xế có thể: đăng ký + được duyệt → tạo chuyến → nhận khách (kể cả gợi ý chiều về) → chạy → nhận tiền vào ví. Admin có thể: duyệt tài xế, cấu hình tuyến/giá/tham số ghép, xem KPI.
