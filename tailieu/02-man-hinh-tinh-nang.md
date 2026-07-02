# 02 — Màn hình & Chức năng

Liệt kê màn hình (screen/route) theo vai trò để AI dựng điều hướng và UI. Web-first/PWA, một codebase chia theo route group. Nhãn `[MVP]`/`[P2]`/`[P3]` như ở `01`.

## Cấu trúc route group (Next.js App Router)

```
app/
  (auth)/         # đăng nhập OTP, chọn vai trò
  (customer)/     # giao diện khách
  (driver)/       # giao diện tài xế
  (admin)/        # bảng quản trị
```

Phân quyền: sau đăng nhập, `user.role ∈ {customer, driver, admin}` quyết định group được vào. Một số điện thoại có thể vừa là khách vừa là tài xế (hai hồ sơ, một tài khoản) — cho phép chuyển vai trò.

---

## A. Khách hàng — màn hình

| Màn hình | Route | Nội dung chính | Nhãn |
|----------|-------|----------------|------|
| Đăng nhập OTP | `/login` | Nhập SĐT → OTP → vào app | MVP |
| Trang chủ / Đặt chuyến | `/` | Form: điểm đón, điểm đến, ngày giờ, số người, loại xe, hình thức (private/pooled) | MVP |
| Kết quả & chọn chuyến | `/search` | Danh sách chuyến/tài xế phù hợp + giá từng hình thức; nút "để lại yêu cầu tìm chuyến" | MVP |
| Chi tiết & xác nhận | `/booking/new` | Tóm tắt chuyến, giá, ô gửi deal, điều khoản/hợp đồng điện tử, nút đặt | MVP |
| Chuyến của tôi (đang diễn ra) | `/trips/[id]` | Bản đồ realtime, ETA, trạng thái, thông tin tài xế/xe, chia sẻ hành trình, SOS | MVP |
| Thanh toán | `/trips/[id]/pay` | Chọn cash/ví; biên nhận sau khi xong | MVP |
| Đánh giá | `/trips/[id]/review` | Chấm sao + nhận xét | MVP |
| Lịch sử chuyến | `/history` | Danh sách chuyến đã đi + biên nhận | MVP |
| Hồ sơ | `/profile` | Thông tin cá nhân, địa điểm hay đi, phương thức thanh toán | MVP |
| Gửi hàng | `/parcel/new` | Form điểm gửi/nhận, trọng lượng/kích thước, người nhận | P2 |
| Đặt khứ hồi | (mở rộng form đặt chuyến) | Tick "khứ hồi" + chọn giờ về | P2 |

## B. Tài xế — màn hình

| Màn hình | Route | Nội dung chính | Nhãn |
|----------|-------|----------------|------|
| Đăng ký & KYC | `/driver/onboarding` | Nộp giấy phép lái xe, đăng ký xe, ảnh xe; nhập loại xe + số chỗ + biển số | MVP |
| Bảng điều khiển tài xế | `/driver` | Tổng quan: chuyến sắp tới, ghế trống, gợi ý khách (đi + chiều về), thu nhập | MVP |
| Đăng ký tuyến & khung giờ | `/driver/routes` | Chọn tuyến thường chạy, khung giờ; bật "đăng chuyến tự động" | MVP |
| Tạo chuyến | `/driver/trips/new` | Tuyến, giờ khởi hành, số ghế, hình thức, giá (trong khung) | MVP |
| Chuyến của tôi | `/driver/trips/[id]` | Danh sách khách ghép, thứ tự đón/trả, chỉ đường, cập nhật trạng thái | MVP |
| Gợi ý khách (matching inbox) | `/driver/matches` | Khách phù hợp tuyến/khung giờ + khách chiều về; nhận/từ chối | MVP |
| Ví & thu nhập | `/driver/wallet` | `available_balance`, `escrow_balance`, lịch sử, yêu cầu rút | MVP |
| Hồ sơ & đánh giá | `/driver/profile` | Thông tin, xe, đánh giá, điểm xếp hạng | MVP |
| Hàng ghép | `/driver/parcels` | Hàng được ghép vào chuyến; xác nhận giao | P2 |

## C. Quản trị — màn hình

| Màn hình | Route | Nội dung chính | Nhãn |
|----------|-------|----------------|------|
| Dashboard | `/admin` | KPI: tỉ lệ lấp ghế, tỉ lệ quay đầu, dead mileage %, GMV, take rate, thời gian chờ ghép, tỉ lệ hủy | MVP |
| Duyệt tài xế | `/admin/drivers` | Danh sách + hồ sơ + giấy tờ; duyệt/từ chối/khóa | MVP |
| Khách hàng | `/admin/customers` | Danh sách, lịch sử, xử lý vi phạm | MVP |
| Tuyến & vùng | `/admin/routes` | Tạo/sửa tuyến, điểm đón/trả (hubs), lộ trình tham chiếu | MVP |
| Giá | `/admin/pricing` | market/floor price, hệ số cao điểm, chế độ định giá | MVP |
| Cấu hình ghép | `/admin/matching-config` | Tham số theo tuyến: lệch tuyến, đi vòng, cửa sổ thời gian, ưu tiên | MVP |
| Giao dịch & ví | `/admin/finance` | Giao dịch, ký quỹ, duyệt rút tiền, đối soát, cấu hình phí | MVP |
| Khiếu nại | `/admin/disputes` | Tiếp nhận & xử lý, gắn chuyến/giao dịch | MVP |
| Khuyến mãi & thông báo | `/admin/promotions` | Mã giảm, thưởng tài xế, referral, gửi thông báo | MVP |
| Hàng & shipper | `/admin/logistics` | parcel_order, shipper, điểm trung chuyển | P2/P3 |

## Thành phần dùng chung (shared components)

- `AddressAutocompleteInput` (Goong places autocomplete)
- `RouteMap` (hiển thị lộ trình + vị trí realtime)
- `TripStatusBadge`, `PriceBreakdown`, `RatingStars`
- `WalletBalanceCard`, `OtpInput`
- `RealtimeTrackingProvider` (Supabase Realtime channel theo trip_id)
