# 00 — Tổng quan dự án

## 1. Tầm nhìn

Thuận Chuyến biến năng lực vận chuyển đang lãng phí thành một mạng lưới thông minh. Mỗi ngày có rất nhiều chuyến xe liên tỉnh (4/7/16 chỗ, xe hợp đồng, xe cá nhân/doanh nghiệp) chạy với ghế trống hoặc khoang hàng còn dư — đặc biệt ở chiều quay đầu. Nền tảng ghép đúng **người – hàng – xe – tuyến – thời điểm** để không chuyến nào chạy rỗng.

**Tuyên ngôn giá trị:** "Không chuyến xe nào chạy rỗng — tài xế tăng thu nhập từ chiều về, khách đi với giá minh bạch, an toàn, đón/trả tận nơi."

## 2. Mô hình ba lớp

Một chuyến xe đang chạy có thể tạo nhiều dòng doanh thu:

| Lớp | Tên | Mô tả | Trạng thái build |
|-----|-----|-------|------------------|
| **Lớp 1** | Chở người (ride pooling) | Ghép nhiều khách cùng hướng vào một chuyến; hoặc đi riêng (bao xe) | **MVP — build trước** |
| **Lớp 2** | Hàng ghép (cargo pooling) | Ghép kiện hàng nhỏ (0,5 – vài chục kg) vào chuyến người đang chạy cùng tuyến | Phase 2 |
| **Lớp 3** | Chặng cuối (last-mile) | Mạng shipper xe máy + điểm trung chuyển giao hàng tận tay người nhận | Phase 3 |

Nguyên tắc: **chứng minh xong lớp trước (đủ thanh khoản, vận hành ổn) mới xây lớp sau.**

## 3. Ba vai trò người dùng

- **Khách hàng (customer):** đặt chuyến đi (và sau này gửi hàng), chọn đi riêng hoặc ghép, theo dõi hành trình, thanh toán, đánh giá.
- **Tài xế (driver):** đăng ký tuyến/khung giờ, nhận chuyến, xem khách ghép + thứ tự đón/trả, quản lý ví, được khớp khách chiều về.
- **Quản trị viên (admin):** duyệt/xác minh tài xế, quản lý tuyến – giá, cấu hình thuật toán ghép, đối soát ví, xử lý khiếu nại, xem báo cáo.

## 4. Phạm vi

### Trong phạm vi (toàn dự án)
- Ghép chuyến & đặt xe liên tỉnh từ TP.HCM đi tỉnh lân cận (và chiều ngược lại), cho xe 4/7/16 chỗ.
- Hai hình thức: đi riêng (bao xe) và ghép chuyến.
- Tối ưu chiều quay đầu (backhaul).
- Ghép hàng nhỏ (Lớp 2) và giao chặng cuối (Lớp 3) — đặc tả đầy đủ, build theo phase.

### Ngoài phạm vi (giai đoạn đầu)
- Gọi xe nội thành theo nhu cầu tức thì (cạnh tranh trực tiếp Grab/Be trong phố).
- Cho thuê xe tự lái, hợp đồng dài hạn theo tháng.
- Giao hàng độc lập không gắn vào chuyến người.

## 5. Hai hình thức chuyến (cốt lõi để hiểu data + matching)

| Hình thức | Mô tả | Cách tính tiền |
|-----------|-------|----------------|
| `private` (đi riêng / bao xe) | Một khách/nhóm thuê trọn xe | Khách trả toàn bộ giá chuyến |
| `pooled` (ghép chuyến) | Nhiều khách cùng hướng đi chung, đón/trả ở các điểm khác nhau dọc tuyến | Tổng giá chia giữa các khách (xem `04`) |

## 6. Đặc thù nghiệp vụ then chốt (AI cần nắm)

1. **Chuyến liên tỉnh chủ yếu là đặt trước (scheduled), không phải gọi tức thì.** Đặt trước càng sớm → càng dễ ghép. Hệ thống ưu tiên luồng "đặt trước theo lịch".
2. **Chiều quay đầu là tài sản kinh tế lớn nhất.** Khi tài xế nhận lượt đi, hệ thống lập tức tìm khách cho chiều về.
3. **Ghép bị giới hạn bởi "độ lệch tuyến cho phép"** — điểm đón/trả khách ghép phải gần lộ trình chính (xem `04`).
4. **Giá có giá thị trường (tham chiếu) và giá sàn (mức thấp nhất).** Không cho deal xuống dưới giá sàn.
5. **Ràng buộc pháp lý ảnh hưởng thiết kế** (xem `05`): mô hình có thể vận hành qua hợp tác xã (HTX) → cần chế độ "ai định giá", lưu hợp đồng điện tử, xác minh xe/tài xế.

## 7. Thuật ngữ (glossary)

| Thuật ngữ | Tiếng Anh / mã | Định nghĩa |
|-----------|----------------|------------|
| Ghép chuyến | `pooled` ride | Nhiều khách lạ đi chung một xe cùng hướng, chia chi phí |
| Đi riêng / bao xe | `private` ride | Một khách/nhóm thuê trọn xe |
| Lượt đi | outbound `trip` | Chuyến từ điểm xuất phát đến điểm đến khách đặt |
| Chiều quay đầu | backhaul / return `trip` | Chuyến ngược lại sau khi hoàn thành lượt đi |
| Tỉ lệ quay đầu có khách | backhaul fill rate | % chuyến chiều về có khách trả tiền / tổng chuyến |
| Quãng đường rỗng | dead mileage | Số km chạy không chở khách/hàng |
| Hành lang tuyến | route corridor | Dải không gian dọc lộ trình chính |
| Giới hạn lệch tuyến | detour tolerance | Khoảng cách tối đa điểm đón/trả khách ghép lệch khỏi lộ trình |
| Ngân sách đi vòng | detour budget | Quãng đường/thời gian chuyến được phép dài thêm do ghép |
| Cửa sổ thời gian | time window | Khoảng thời gian khởi hành mà các khách có thể ghép chung |
| Giá thị trường | market price | Giá tham chiếu hiển thị cho khách |
| Giá sàn | floor price | Mức giá thấp nhất tài xế chấp nhận |
| Tỉ lệ lấp ghế | seat fill rate | Ghế đã bán / tổng ghế xe |
| Ví tài xế 2 lớp | two-layer wallet | `available_balance` (rút được) + `escrow_balance` (ký quỹ/tạm giữ) |
| HTX | transport cooperative | Hợp tác xã vận tải — pháp nhân có giấy phép kinh doanh vận tải |
| KYC | KYC | Xác minh danh tính/giấy tờ tài xế |
