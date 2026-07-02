# 04 — Thuật toán ghép chuyến (lõi hệ thống)

Đây là phần tạo ra giá trị khác biệt. Mọi tham số đều lấy từ bảng `matching_config` theo `route_id` (fallback config mặc định). **Không hard-code số.**

## 1. Tổng quan luồng ghép

Có hai luồng tạo cung–cầu:

- **Tài xế tạo `trip`** (có lộ trình, giờ, số ghế) → khách tìm thấy và đặt (`booking`).
- **Khách tạo `ride_request`** (chưa có trip phù hợp) → hệ thống/tài xế khớp request vào một `trip`.

Engine chạy ở hai thời điểm:
1. Khi khách tìm chuyến → trả về danh sách `trip` khớp, xếp hạng.
2. Khi có `trip` mới hoặc `ride_request` mới → chạy matching nền (background job / Edge Function) để gợi ý cho phía còn lại + gợi ý chiều về.

## 2. Tiêu chí khớp một booking vào một trip

Một `ride_request` (hoặc truy vấn tìm chuyến) khớp với một `trip` khi **thỏa đồng thời**:

1. **Cùng hướng tuyến (corridor match):** điểm đón và điểm trả của khách đều nằm trong hành lang của tuyến trip, theo đúng chiều di chuyển (điểm đón ở "trước" điểm trả dọc lộ trình).
2. **Trong cửa sổ thời gian:** `|trip.departure_time − request.desired_time| ≤ time_window_minutes`.
3. **Còn chỗ:** `trip.seats_available ≥ request.pax`.
4. **Điểm đón/trả gần lộ trình:** trong `max_lateral_deviation_km` (xem mục 3).
5. **Đi vòng trong ngân sách:** thêm điểm đón/trả không làm chuyến vượt `max_detour_minutes`/`max_detour_km` (xem mục 3).
6. **Loại xe phù hợp:** nếu khách có `vehicle_pref` thì khớp; `pooled` chỉ ghép với `trip.ride_type = 'pooled'`.
7. **Giá:** nếu khách có `max_price`, phải ≥ giá khả thi và ≥ `floor_price`.

## 3. Giới hạn lệch tuyến & ngân sách đi vòng (cốt lõi)

Khi xét thêm khách B vào một trip đã có lộ trình, kiểm tra hai điều kiện:

- **Độ lệch ngang (lateral deviation):** khoảng cách vuông góc từ điểm đón (và điểm trả) của B tới lộ trình hiện tại của trip. Nếu > `max_lateral_deviation_km` → loại.
- **Ngân sách đi vòng (detour budget):** tính lại lộ trình khi chèn điểm đón/trả của B; phần tăng thêm so với lộ trình hiện tại phải ≤ `max_detour_minutes` (và `max_detour_km`).

```
function canPool(trip, pickup, dropoff, config):
    # 1. lệch ngang
    if distanceToPolyline(pickup, trip.polyline) > config.max_lateral_deviation_km: return false
    if distanceToPolyline(dropoff, trip.polyline) > config.max_lateral_deviation_km: return false

    # 2. thứ tự dọc tuyến: pickup phải ở trước dropoff theo chiều đi
    if projectionIndex(pickup, trip.polyline) >= projectionIndex(dropoff, trip.polyline): return false

    # 3. ngân sách đi vòng: chèn điểm và tính lại
    newRoute   = routeWithStops(trip.stops + [pickup, dropoff])   # gọi Goong Directions
    extraMin   = newRoute.duration_min - trip.duration_min
    extraKm    = newRoute.distance_km  - trip.distance_km
    if extraMin > config.max_detour_minutes: return false
    if extraKm  > config.max_detour_km:      return false

    return true
```

> `distanceToPolyline`, `projectionIndex` dùng PostGIS (`ST_Distance`, `ST_LineLocatePoint`) hoặc thư viện geo phía server. `routeWithStops` gọi Goong Directions API với waypoints.

**Đánh đổi (ghi rõ cho admin hiểu):** tham số rộng → ghép nhiều, lấp ghế cao, nhưng khách chính đi vòng lâu; tham số hẹp → khách hài lòng nhưng ít cơ hội ghép. Cần tinh chỉnh theo dữ liệu từng tuyến.

## 4. Xếp hạng kết quả (ranking) khi khách tìm chuyến

Trả về danh sách `trip` khớp, sắp theo điểm tổng hợp (cao = tốt):

```
score(trip) =
    w1 * timeProximity(trip)        # giờ càng gần giờ khách muốn càng tốt
  + w2 * (1 - detourRatio(trip))    # đi vòng càng ít càng tốt
  + w3 * driverRating(trip)         # tài xế điểm cao
  + w4 * priceAttractiveness(trip)  # giá càng tốt cho khách càng cao
  + w5 * seatFitBonus(trip)         # vừa khít số ghế còn lại
```

Trọng số `w1..w5` để trong config/hằng số, có thể chỉnh. Mặc định ưu tiên thời gian và độ-ít-đi-vòng.

## 5. Thứ tự đón/trả trong chuyến ghép

Sau khi chốt các booking của một trip `pooled`, sắp thứ tự đón/trả theo vị trí chiếu dọc lộ trình:

```
stops = []
for b in bookings: stops += [{point: b.pickup, type: 'pickup', booking: b},
                             {point: b.dropoff, type: 'dropoff', booking: b}]
sort stops by projectionIndex(point, trip.polyline) ascending
# ràng buộc: pickup của một booking luôn đứng trước dropoff của chính nó
assign b.pickup_order, b.dropoff_order theo thứ tự đã sắp
```

## 6. Tối ưu chiều quay đầu (backhaul) — quan trọng nhất

Khi một `trip` lượt đi (`direction='outbound'`) được tạo/nhận:

```
on trip.outbound created/accepted:
    eta_dest      = trip.departure_time + trip.duration_min
    return_window = [eta_dest, eta_dest + RETURN_SEARCH_HORIZON]   # vd +3 giờ
    # tìm ride_request đi ngược hướng (dest→origin) trong khung thời gian này
    candidates = ride_requests where
        direction ~ reverse(trip.route)
        and desired_time in return_window
        and canPool(virtualReturnTrip, req.pickup, req.dropoff, config)
    notify driver with candidates
    # nếu tài xế nhận → tạo trip return với parent_trip_id = trip.id
```

**Chỉ số theo dõi:** `backhaul_fill_rate = số trip return có booking / số trip outbound`. Hiển thị cho tài xế và admin. Mỗi % tăng thêm trực tiếp tăng thu nhập tài xế → cho phép hạ giá lượt đi để cạnh tranh.

Hỗ trợ: nếu khách đặt **khứ hồi** (US-C12), tạo luôn `ride_request` chiều về → nguồn cầu chiều về ổn định hơn.

## 7. Cơ chế chia tiền khi ghép (fare splitting)

Tổng giá chuyến `pooled` chia cho các khách. Triển khai 3 chiến lược, chọn qua cấu hình (`fare_split_strategy`):

### (a) `equal` — chia đều theo đầu khách trên đoạn cùng đi
Đơn giản nhất. Mỗi ghế trả phần bằng nhau trên đoạn chung.

### (b) `distance` — theo quãng đường thực mỗi khách đi
```
total_collectable = base_price_of_full_route (hoặc tổng định mức)
for b in bookings:
    b.fare = total_collectable * (b.segment_km / sum(all_segment_km))
```

### (c) `hybrid` — phí nền chia đều + phần theo quãng đường
```
for b in bookings:
    b.fare = base_fee_per_pax + per_km_rate * b.segment_km
```

**Ràng buộc chung:** mỗi `b.fare ≥ giá tối thiểu mỗi ghế` và tổng thu không vượt giá `private` tương đương; `pooled` phải rẻ hơn `private` đủ để tạo động lực ghép.

> Quyết định chọn chiến lược nào → để trong `matching_config`/cấu hình hệ thống, mặc định `hybrid`. Có thể A/B theo tuyến.

## 8. Định giá (pricing)

```
price = base (market_price theo route + vehicle_type + ride_type)
        * surge_multiplier (theo giờ cao điểm/cầu>cung, có TRẦN để tránh hét giá)
clamp: price >= floor_price
```

- Chế độ `platform_pricing`: hệ thống/tài xế đặt giá trong khung [floor, …].
- Chế độ `htx_pricing`: giá do tuyến/HTX niêm yết, tài xế không tự đặt (ràng buộc pháp lý — xem `05`).

## 9. Vị trí chạy engine trong kiến trúc

- **Truy vấn tìm chuyến (đồng bộ):** Postgres function (RPC) `search_trips(params)` dùng PostGIS lọc nhanh corridor + thời gian + ghế, rồi tầng app tính detour/ranking (gọi Goong cho top N để tiết kiệm quota).
- **Matching nền (bất đồng bộ):** Supabase Edge Function / cron chạy khi có trip/request mới: ghép, gợi ý, tìm backhaul, gửi `notifications` + Realtime.
- **Cache khoảng cách:** lưu kết quả Directions theo cặp điểm để giảm gọi API lặp.
