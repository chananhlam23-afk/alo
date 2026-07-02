# 05 — Luật nghiệp vụ (Business Rules)

Các quy tắc dưới đây ràng buộc hành vi hệ thống. Phần pháp lý ảnh hưởng trực tiếp đến thiết kế — đọc kỹ mục 6.

## 1. Đặt chỗ & trạng thái

- BR-1.1 Khách tạo `booking` → `pending`. Khi tài xế/hệ thống nhận → `confirmed`, đồng thời `trip.seats_available -= booking.seats`.
- BR-1.2 Một `trip` chuyển `full` khi `seats_available = 0`. Không nhận thêm booking.
- BR-1.3 Khi tài xế bắt đầu chạy: trip `departed` → `in_transit`; booking theo trạng thái đón/trả từng khách.
- BR-1.4 Hoàn tất tất cả điểm trả → trip `completed`, các booking `completed`.

## 2. Giá & deal

- BR-2.1 Mọi giá hiển thị và mọi deal **không được thấp hơn `floor_price`** của (route, vehicle_type, ride_type).
- BR-2.2 `pooled` phải rẻ hơn `private` tương đương (chênh lệch tối thiểu cấu hình được, vd ≥ 20%).
- BR-2.3 Hệ số cao điểm có **trần** (vd ≤ 1.5×) để tránh hét giá.
- BR-2.4 Chế độ định giá toàn hệ thống: `platform_pricing` hoặc `htx_pricing` (xem mục 6).

## 3. Hủy chuyến (khung — số cụ thể cấu hình được)

| Tình huống | Quy tắc đề xuất |
|------------|-----------------|
| Khách hủy sớm (≥ `T_free` trước giờ đi, vd 12h) | Miễn phí, hoàn 100% nếu đã trả |
| Khách hủy sát giờ (< `T_free`) | Tính phí hủy `cancel_fee` (vd 20–30% hoặc mức cố định) |
| Tài xế hủy | Không trừ khách; ghi nhận điểm uy tín tài xế; nếu sát giờ có thể phạt ký quỹ |
| Tài xế bỏ chuyến (no-show) | Hoàn 100% cho khách + bù/ưu tiên ghép lại; trừ uy tín/ký quỹ tài xế |

- BR-3.1 Phí hủy/đặt cọc trừ qua **ví ký quỹ** (`escrow`) hoặc cổng thanh toán, ghi `wallet_transactions`.
- BR-3.2 Mọi mốc thời gian (`T_free`), mức phí (`cancel_fee`) để trong cấu hình theo tuyến, không hard-code.

## 4. Ví tài xế hai lớp & dòng tiền

- BR-4.1 Ví gồm `available_balance` (rút được) và `escrow_balance` (tạm giữ: đặt cọc, giữ chỗ, xử lý hủy/tranh chấp).
- BR-4.2 Khi chuyến hoàn tất & khách thanh toán: ghi `credit` cho tài xế phần thu nhập, `commission`/`debit` phần phí nền tảng.
- BR-4.3 Nếu thu qua cổng (khách trả trước): tiền vào hệ thống → tài xế nhận sau đối soát; nếu khách trả tiền mặt: tài xế thu hộ, hệ thống thu phí nền tảng từ ví (debit) theo định kỳ.
- BR-4.4 Mọi thay đổi số dư phải ghi `wallet_transactions` với `balance_after` (đối soát được).
- BR-4.5 Bút toán ví **chỉ thực hiện phía server** (RPC security definer / Edge Function), client không ghi trực tiếp.
- BR-4.6 `payout_request` cần admin duyệt; chỉ rút từ `available_balance`.

## 5. Đánh giá, uy tín, an toàn

- BR-5.1 Đánh giá hai chiều; cập nhật `rating_avg`, `rating_count` của tài xế (và sau này của khách).
- BR-5.2 Tài xế/khách dưới ngưỡng điểm bị hạn chế hoặc rà soát.
- BR-5.3 Khách có thể chia sẻ link hành trình realtime cho người thân; nút SOS hiển thị số hỗ trợ + (tùy chọn) số khẩn cấp.
- BR-5.4 Trước khi lên xe, khách thấy biển số, loại xe, tên + ảnh + điểm tài xế.

## 6. Ràng buộc pháp lý (ẢNH HƯỞNG THIẾT KẾ — bắt buộc tuân thủ)

> Căn cứ Nghị định 10/2020/NĐ-CP và bối cảnh siết "xe ghép, xe tiện chuyến". Đây là vùng rủi ro cao; các quy tắc dưới đây giúp hệ thống "an toàn theo thiết kế". **Cần cấu hình theo tư vấn pháp lý thực tế.**

- BR-6.1 **Xác minh trước khi nhận chuyến:** chỉ tài xế `status='verified'` với `vehicle.phu_hieu_valid = true` mới được nhận/chạy chuyến. (Lý do: xe chở khách kinh doanh phải có phù hiệu/biển vàng.) Thêm cảnh báo nếu `plate_color='white'`.
- BR-6.2 **Chế độ định giá:** hỗ trợ `htx_pricing` — khi bật, **giá do tuyến/HTX niêm yết**, nền tảng/tài xế không tự quyết giá cho từng chuyến. (Lý do: "quyết định giá cước" khiến chủ thể bị coi là đơn vị kinh doanh vận tải.)
- BR-6.3 **Hợp đồng điện tử:** mỗi `booking` sinh một `e_contract` (snapshot giá, tuyến, các bên, điều khoản). Lưu cùng dữ liệu chuyến.
- BR-6.4 **Lưu trữ lịch sử giao dịch tối thiểu 2 năm:** không xóa cứng `bookings`, `payments`, `e_contracts`, `trips`; dùng `is_archived`/soft-delete. (Theo yêu cầu lưu trữ của Nghị định 10 đối với phần mềm kết nối.)
- BR-6.5 **Liên kết HTX:** `drivers.htx_id` cho biết xe thuộc HTX nào; phục vụ truy xuất trách nhiệm pháp lý.
- BR-6.6 **Không xây doanh thu cốt lõi dựa trên khe "chia sẻ chi phí"** (vùng xám đang bị siết). Mô hình thu phí phải gắn với cấu trúc hợp lệ (qua HTX/đơn vị vận tải).
- BR-6.7 **Cờ tuân thủ cấu hình được:** đặt các quy tắc trên sau cờ cấu hình (`compliance_mode`) để bật/tắt theo hướng dẫn pháp lý từng giai đoạn/tỉnh, có ghi log thay đổi.

## 7. Khuyến mãi

- BR-7.1 `promo_code` áp dụng cho khách hoặc tài xế; kiểm `valid_from/valid_to`, `max_uses`.
- BR-7.2 Giảm giá không được kéo giá khách trả xuống dưới chi phí thực mà tài xế nhận (phần chênh do nền tảng bù, ghi nhận rõ).

## 8. Dữ liệu & quyền riêng tư

- BR-8.1 Bảo vệ dữ liệu cá nhân tài xế/khách; chỉ hiển thị thông tin cần thiết cho từng vai trò.
- BR-8.2 Không lộ số điện thoại hai phía cho đến khi cần thiết (cân nhắc gọi/chat ẩn danh để giảm rò rỉ giao dịch ngoài app).
