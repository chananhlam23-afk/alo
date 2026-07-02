# Thuận Chuyến — Bộ tài liệu kỹ thuật cho AI Coding Agent

> Đây là bộ đặc tả (spec) đầy đủ để một AI coding agent (Cursor, Claude Code, v.v.) đọc và xây dựng web app **Thuận Chuyến** — nền tảng ghép chuyến vận tải liên tỉnh (người + hàng + chặng cuối) từ TP.HCM đi các tỉnh lân cận.

## Cách dùng bộ tài liệu này (đọc trước khi code)

1. **Đọc theo thứ tự** các file đánh số. File `00` cho bức tranh tổng thể, các file sau đi vào chi tiết.
2. **Quy ước ngôn ngữ:** phần diễn giải bằng tiếng Việt; tên bảng, tên trường, enum, endpoint, biến code đều bằng **tiếng Anh, snake_case** — giữ nguyên, không dịch.
3. **Phạm vi build:** xây theo `08-lo-trinh-build.md`. **MVP chỉ làm Lớp 1 (chở người)**. Lớp 2 (hàng ghép) và Lớp 3 (chặng cuối) được đặc tả đầy đủ để bạn hiểu toàn cảnh nhưng **chưa code ở MVP** — code sau theo roadmap.
4. **Không tự ý mở rộng phạm vi.** Nếu một yêu cầu chưa rõ, ưu tiên giải pháp đơn giản nhất phủ đúng acceptance criteria, và để lại `// TODO:` kèm câu hỏi thay vì tự suy diễn.

## Danh mục file

| File | Nội dung |
|------|----------|
| `00-tong-quan.md` | Tầm nhìn, mô hình 3 lớp, phạm vi, thuật ngữ, nguyên tắc sản phẩm |
| `01-vai-tro-user-stories.md` | 3 vai trò + user stories + acceptance criteria |
| `02-man-hinh-tinh-nang.md` | Danh sách màn hình & chức năng từng vai trò |
| `03-mo-hinh-du-lieu.md` | Mô hình dữ liệu (Postgres/Supabase): bảng, trường, quan hệ, enum |
| `04-thuat-toan-ghep.md` | Lõi: thuật toán ghép chuyến, chiều quay đầu, chia tiền (có pseudo-code) |
| `05-business-rules.md` | Luật nghiệp vụ: giá, hủy, ví tài xế, đánh giá, an toàn, ràng buộc pháp lý |
| `06-api-spec.md` | Đặc tả REST API các endpoint chính |
| `07-kien-truc-ky-thuat.md` | Tech stack, cấu trúc thư mục, tích hợp, biến môi trường |
| `08-lo-trinh-build.md` | Thứ tự build theo phase + danh sách task cho AI |

## Tech stack chốt (chi tiết ở `07`)

- **Frontend:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend & DB:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Bản đồ & định tuyến:** Goong Maps API (geocoding, directions, distance matrix); có thể thay bằng Google Maps
- **Thanh toán:** VNPay / MoMo / ZaloPay (qua webhook) + ví nội bộ
- **Web-first / PWA:** một codebase, 3 giao diện (khách / tài xế / admin) phân theo role; tối ưu di động trước.

## Nguyên tắc quan trọng nhất khi code

- **Lõi giá trị là thuật toán ghép + tối ưu chiều quay đầu** (`04`). Mọi thứ khác hỗ trợ cho phần này.
- **Tham số ghép (bán kính lệch tuyến, cửa sổ thời gian, ngân sách đi vòng) phải cấu hình được qua admin/DB**, không hard-code.
- **Ràng buộc pháp lý ảnh hưởng thiết kế** (xem `05`): có chế độ "ai định giá" (nền tảng vs HTX), lưu hợp đồng điện tử và lịch sử giao dịch ≥ 2 năm, tài xế phải được xác minh trước khi nhận chuyến.
