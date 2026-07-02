# 01 — Vai trò & User Stories

Mỗi story có format: **Là [vai trò], tôi muốn [hành động], để [mục đích].** Kèm acceptance criteria (AC) dạng checklist. Nhãn `[MVP]` = làm ở bản đầu; `[P2]`/`[P3]` = phase sau.

---

## A. Khách hàng (customer)

### US-C01 [MVP] — Đăng ký / đăng nhập
Là khách, tôi muốn đăng nhập bằng số điện thoại (OTP), để dùng app nhanh không cần mật khẩu.
- AC: nhập SĐT → nhận OTP (SMS/Zalo) → xác thực → tạo/đăng nhập tài khoản.
- AC: hồ sơ tối thiểu gồm tên, SĐT; có thể bổ sung email sau.

### US-C02 [MVP] — Tìm & đặt chuyến đi
Là khách, tôi muốn nhập điểm đón, điểm đến, ngày giờ, số người, loại xe, để tìm chuyến phù hợp.
- AC: chọn điểm đón/điểm đến bằng gợi ý địa chỉ (autocomplete qua Goong).
- AC: chọn ngày + giờ mong muốn (mặc định là đặt trước theo lịch).
- AC: chọn số hành khách và (tùy chọn) loại xe 4/7/16 chỗ.
- AC: chọn hình thức `private` (bao xe) hoặc `pooled` (ghép) với giá hiển thị rõ cho từng lựa chọn.

### US-C03 [MVP] — Xem giá minh bạch & gửi đề nghị giá (deal)
Là khách, tôi muốn thấy giá dự kiến trước khi đặt, để không phải mặc cả.
- AC: hiển thị giá dự kiến cho cả `private` và `pooled`.
- AC: cho phép gửi đề nghị giá (deal) nhưng hệ thống không cho nhập dưới `floor_price` của tuyến.
- AC: hiển thị rõ giá `pooled` rẻ hơn `private` bao nhiêu %.

### US-C04 [MVP] — Xác nhận đặt chỗ
Là khách, tôi muốn xác nhận đặt chỗ và nhận trạng thái, để biết chuyến đã được nhận chưa.
- AC: tạo `booking` ở trạng thái `pending` → khi được tài xế/hệ thống nhận thì chuyển `confirmed`.
- AC: nếu chưa có chuyến phù hợp, cho phép để lại "yêu cầu tìm chuyến" (`ride_request`) để hệ thống/tài xế khớp sau.
- AC: hiển thị hợp đồng điện tử/điều khoản trước khi xác nhận (xem `05`).

### US-C05 [MVP] — Xem thông tin tài xế & xe
Là khách, tôi muốn xem loại xe, biển số, đánh giá, tên tài xế khi đã được ghép, để yên tâm.
- AC: sau khi `confirmed`, hiển thị thông tin tài xế + xe + điểm đánh giá.

### US-C06 [MVP] — Theo dõi hành trình
Là khách, tôi muốn theo dõi vị trí xe và thời gian đón dự kiến theo thời gian thực.
- AC: bản đồ hiển thị vị trí tài xế (realtime) + ETA.
- AC: trạng thái chuyến cập nhật: `driver_assigned` → `on_the_way` → `picked_up` → `in_transit` → `completed`.

### US-C07 [MVP] — Thanh toán
Là khách, tôi muốn thanh toán tiền mặt hoặc ví điện tử, để linh hoạt.
- AC: hỗ trợ `cash` và ít nhất một cổng (`vnpay`/`momo`/`zalopay`).
- AC: sau chuyến, phát hành biên nhận điện tử.

### US-C08 [MVP] — Hủy chuyến
Là khách, tôi muốn hủy chuyến theo chính sách rõ ràng, để biết trước có mất phí không.
- AC: hiển thị chính sách hủy theo mốc thời gian (xem `05`); tính phí hủy nếu áp dụng.

### US-C09 [MVP] — Đánh giá tài xế
Là khách, tôi muốn đánh giá sao + nhận xét sau chuyến, để phản hồi chất lượng.
- AC: chấm 1–5 sao + nhận xét tùy chọn; cập nhật điểm trung bình của tài xế.

### US-C10 [MVP] — Lịch sử & an toàn
Là khách, tôi muốn xem lịch sử chuyến và chia sẻ hành trình, để an toàn và tiện tra cứu.
- AC: danh sách chuyến đã đi + biên nhận.
- AC: nút chia sẻ hành trình (link trạng thái) cho người thân; nút khẩn cấp (SOS) hiển thị số hỗ trợ.

### US-C11 [P2] — Gửi hàng nhỏ
Là khách, tôi muốn gửi kiện hàng nhỏ đi tỉnh bằng cách ghép vào chuyến đang chạy, để rẻ và nhanh.
- AC: tạo `parcel_order` với điểm gửi, điểm nhận, trọng lượng/kích thước, người nhận; hệ thống ghép vào `trip` cùng tuyến.

### US-C12 [P2] — Đặt khứ hồi
Là khách, tôi muốn đặt cả lượt đi và lượt về, để chủ động và hỗ trợ tối ưu chiều quay đầu.

---

## B. Tài xế (driver)

### US-D01 [MVP] — Đăng ký & xác minh (KYC)
Là tài xế, tôi muốn đăng ký và nộp giấy tờ, để được duyệt chạy.
- AC: nộp giấy phép lái xe, đăng ký xe, ảnh xe; nhập loại xe + số chỗ + biển số.
- AC: tài khoản ở trạng thái `pending_verification` cho đến khi admin duyệt; **chỉ tài xế `verified` mới nhận chuyến** (ràng buộc pháp lý, xem `05`).

### US-D02 [MVP] — Đăng ký tuyến & khung giờ
Là tài xế, tôi muốn đăng ký các tuyến tôi thường chạy và khung giờ, để được nhận thông báo khi có khách trên tuyến đó.
- AC: chọn tuyến (hoặc cặp điểm đầu–cuối), khung giờ thường chạy.
- AC: hỗ trợ "đăng chuyến tự động" lặp lại hằng ngày trên tuyến cố định.

### US-D03 [MVP] — Tạo & quản lý chuyến
Là tài xế, tôi muốn tạo chuyến đi (lượt đi/chiều về) và quản lý số ghế, để khách đặt được.
- AC: tạo `trip` với tuyến, thời gian khởi hành, số ghế, hình thức (`private`/`pooled`), giá (trong khung cho phép).
- AC: xem danh sách chuyến đã tạo + khách đã đặt.

### US-D04 [MVP] — Nhận / từ chối chuyến được gợi ý
Là tài xế, tôi muốn nhận hoặc từ chối các chuyến/khách hệ thống gợi ý, để chủ động.
- AC: nhận thông báo khi có khách phù hợp tuyến/khung giờ.
- AC: xem danh sách khách ghép + thứ tự đón/trả đề xuất (xem `04`).

### US-D05 [MVP] — Gợi ý khách chiều về (backhaul)
Là tài xế, tôi muốn được gợi ý khách cho chiều về ngay khi nhận lượt đi, để không chạy rỗng.
- AC: khi nhận một `trip` lượt đi, hệ thống tự tìm và thông báo khách tiềm năng cho chiều về trong khung thời gian dự kiến tới nơi.

### US-D06 [MVP] — Định giá & phản hồi deal
Là tài xế, tôi muốn đặt giá trong khung cho phép và phản hồi đề nghị deal của khách.
- AC: không cho đặt dưới `floor_price`; phản hồi (chấp nhận/từ chối) đề nghị giá của khách.
- AC: nếu hệ thống ở chế độ `htx_pricing`, giá do tuyến/HTX quyết, tài xế không tự đặt (xem `05`).

### US-D07 [MVP] — Dẫn đường & cập nhật trạng thái
Là tài xế, tôi muốn xem chỉ đường tới các điểm đón/trả theo thứ tự và cập nhật trạng thái chuyến.
- AC: chia sẻ vị trí realtime; chỉ đường tới điểm đón/trả kế tiếp.
- AC: cập nhật trạng thái: bắt đầu → đón khách → đang đi → hoàn thành.

### US-D08 [MVP] — Ví tài xế
Là tài xế, tôi muốn xem ví (số dư khả dụng + ký quỹ), thu nhập và yêu cầu rút tiền.
- AC: hiển thị `available_balance` và `escrow_balance`; lịch sử giao dịch.
- AC: tạo yêu cầu rút tiền (`payout_request`).

### US-D09 [MVP] — Hồ sơ uy tín
Là tài xế, tôi muốn xem đánh giá và điểm xếp hạng, để cải thiện.

### US-D10 [P2] — Nhận chở hàng ghép
Là tài xế, tôi muốn nhận kiện hàng ghép vào chuyến đang chạy, để tăng thu nhập.
- AC: xem hàng được ghép vào chuyến + điểm gửi/nhận; xác nhận giao.

---

## C. Quản trị viên (admin)

### US-A01 [MVP] — Duyệt & xác minh tài xế
- AC: xem hồ sơ + giấy tờ tài xế; duyệt/từ chối; chuyển trạng thái `verified`/`rejected`; khóa/mở tài khoản.

### US-A02 [MVP] — Quản lý tuyến & vùng
- AC: tạo/sửa `route` (điểm đầu, điểm cuối, danh sách điểm đón/trả `hubs`, lộ trình tham chiếu).

### US-A03 [MVP] — Quản lý giá
- AC: thiết lập `market_price`, `floor_price`, hệ số cao điểm theo tuyến + loại xe.
- AC: chọn chế độ định giá: `platform_pricing` hoặc `htx_pricing`.

### US-A04 [MVP] — Cấu hình thuật toán ghép
- AC: chỉnh tham số ghép theo tuyến: `max_lateral_deviation_km`, `max_detour_minutes`, `time_window_minutes`, quy tắc ưu tiên (xem `04`).

### US-A05 [MVP] — Quản lý giao dịch & ví
- AC: xem giao dịch, ký quỹ, duyệt `payout_request`, đối soát; cấu hình hoa hồng/phí.

### US-A06 [MVP] — Bảng điều khiển & báo cáo
- AC: theo dõi KPI: tỉ lệ lấp ghế, tỉ lệ quay đầu có khách, dead mileage %, GMV, take rate, thời gian chờ ghép, tỉ lệ hủy, NPS.

### US-A07 [MVP] — Khiếu nại & tranh chấp
- AC: tiếp nhận, xử lý khiếu nại; gắn với chuyến/giao dịch liên quan.

### US-A08 [MVP] — Khuyến mãi & thông báo
- AC: tạo mã giảm giá, thưởng tài xế, chương trình giới thiệu; gửi thông báo/đẩy tin tuyến.

### US-A09 [P2/P3] — Quản lý hàng & shipper
- AC: quản lý `parcel_order`, mạng `shipper`, điểm trung chuyển; theo dõi giao chặng cuối.
