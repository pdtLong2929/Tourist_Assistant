# Hệ thống Gợi ý Du lịch Việt Nam: Sản phẩm Khả dụng Tối thiểu (MVP)

---

## Tóm tắt

Du lịch tại Việt Nam, đặc biệt ở Thành phố Hồ Chí Minh và Hà Nội, đòi hỏi nhiều quyết định phức tạp liên quan đến lựa chọn điểm đến và phương tiện di chuyển. Bài viết này trình bày Sản phẩm Khả dụng Tối thiểu (MVP) của một hệ thống backend tập trung vào ba miền dữ liệu cốt lõi: quản lý điểm đến, tích hợp giao thông công cộng qua GTFS, và thị trường cho thuê phương tiện. Hệ thống được xây dựng trên schema PostgreSQL (`trip_db`) và được hỗ trợ bởi pipeline ETL thu thập dữ liệu từ web scraper, nguồn GTFS, và bộ dữ liệu cho thuê. MVP bao gồm 12 cửa hàng cho thuê, khoảng 40.000 bản ghi phương tiện, và dữ liệu GTFS cho hai thành phố với hơn 11.000 điểm dừng và 695 tuyến đường, tạo nền tảng dữ liệu ổn định cho các tính năng gợi ý và định tuyến trong tương lai.

---

## 1. Giới thiệu

Lập kế hoạch du lịch tại Việt Nam đòi hỏi người dùng phải tham khảo nhiều nguồn thông tin rời rạc: nền tảng đánh giá để tìm thông tin điểm đến, website của các cơ quan giao thông để tra cứu lịch trình xe buýt và tàu điện, và các dịch vụ cho thuê riêng biệt cho xe máy và ô tô. Dự án này hướng đến việc tích hợp các miền dữ liệu đó vào một hệ thống backend thống nhất.

Tài liệu này xác định phạm vi MVP — tập hợp tối thiểu các cấu trúc dữ liệu và thành phần pipeline cần thiết để thiết lập và nạp dữ liệu cho ba miền cốt lõi:

1. **Điểm đến** — dữ liệu POI có cấu trúc.
2. **Dữ liệu giao thông GTFS** — tuyến đường, điểm dừng và lịch trình giao thông công cộng tại Hà Nội và Thành phố Hồ Chí Minh.
3. **Cho thuê phương tiện** — vị trí cửa hàng, kho phương tiện và giá thuê theo ngày.

Các tính năng ngoài ba miền này (tài khoản người dùng, lập kế hoạch chuyến đi, tính toán lộ trình, chấm điểm) nằm ngoài phạm vi MVP và được ghi chú ở phần liên quan.

---

## 2. Tổng quan hệ thống

### 2.1 Kiến trúc

```
[Nguồn dữ liệu ngoài]
  Google Maps Destinations Scraper (gosom)
  Scraper dữ liệu GTFS từ Overpass API (Hà Nội, TP.HCM)
  CSV dữ liệu phương tiện cho thuê
        |
        v
[Tầng ETL]
  gtfs_loader.py
  CSV import scripts
        |
        v
[PostgreSQL — schema trip_db]
  destinations
  gtfs_* tables (FEED000001, FEED000002, HCMCNOBUS, HANOINOBUS)
  transport_modes
```

Dữ liệu dịch vụ cho thuê không được lưu trữ trong cơ sở dữ liệu PostgreSQL chính. Thay vào đó, dữ liệu này được phục vụ qua API, vì hệ thống được thiết kế như một cầu nối đến các giải pháp cho thuê bên thứ ba hiện có, thay vì một nền tảng cho thuê độc lập.

### 2.2 Công nghệ sử dụng

| thành phần | công nghệ |
|---|---|
| cơ sở dữ liệu | PostgreSQL 13+, schema `trip_db` |
| loader | Python 3.8+ |
| dữ liệu giao thông | định dạng chuẩn GTFS |
| dữ liệu cho thuê | CSV phục vụ qua API |

---

## 3. Mô hình dữ liệu

### 3.1 Người dùng và sở thích

Dữ liệu người dùng và sở thích được đưa vào MVP để hỗ trợ gợi ý cho thuê phương tiện cá nhân hóa. Cá nhân hóa theo điểm đến (chấm điểm theo khía cạnh) nằm ngoài phạm vi MVP.

| bảng | các trường chính |
|---|---|
| `users` | user_id, name, email, password/googleId, tokens, timestamps |
| `user_preferences` | user_id (PK), phương thức di chuyển ưa thích, tag điểm đến ưa thích, tag tránh, ngân sách tối thiểu/tối đa |

Các trường sở thích được lưu dưới dạng JSONB để cho phép lọc linh hoạt mà không cần thay đổi schema. Trong MVP, các sở thích này được dùng riêng để lọc và xếp hạng các lựa chọn cho thuê theo hạng phương tiện, ngân sách và phương thức di chuyển.

### 3.2 Điểm đến

Miền điểm đến lưu trữ dữ liệu điểm tham quan du lịch trên khắp Việt Nam, chủ yếu tại Thành phố Hồ Chí Minh. Dữ liệu khởi tạo hiện tại chứa 1.847 bản ghi điểm đến, bao gồm các điểm du lịch, công viên, chợ, di tích lịch sử, bảo tàng, địa điểm tôn giáo và các điểm ẩm thực.

| bảng | các trường chính |
|---|---|
| `destinations` | destination_id, name, category, address, lat/lng, rating_avg, description, is_active, timestamps |

### 3.3 Dữ liệu giao thông GTFS

Dữ liệu giao thông công cộng tuân theo schema GTFS chuẩn [1], với cột `feed_id` trên mỗi bảng để hỗ trợ nhiều nguồn feed trong cùng một cơ sở dữ liệu. Bốn feed được khởi tạo:

| feed ID | thành phố | cơ quan |
|---|---|---|
| `FEED000001` | Hà Nội | Transerco |
| `FEED000002` | Thành phố Hồ Chí Minh | HCMC Bus |
| `HCMCNOBUS` | Thành phố Hồ Chí Minh | HURC |
| `HANOINOBUS` | Hà Nội | HPC |

| bảng | mô tả |
|---|---|
| `gtfs_feeds` | registry feed với metadata, thành phố, cờ active và timestamps |
| `gtfs_agency` | thông tin cơ quan giao thông theo feed |
| `gtfs_routes` | định nghĩa tuyến đường (tên tuyến, loại, màu) |
| `gtfs_stops` | vị trí điểm dừng với lat/lng |
| `gtfs_trips` | bản ghi chuyến đi liên kết với tuyến và lịch |
| `gtfs_stop_times` | giờ đến/đi tại mỗi điểm dừng theo chuyến |
| `gtfs_calendar` | mẫu ngày phục vụ trong tuần |

Dữ liệu GTFS được tạo ra hiện tại chứa:

| file | số hàng (không tính header) |
|---|---|
| Điểm dừng TP.HCM | 5.961 |
| Điểm dừng Hà Nội | 5.302 |
| Tuyến TP.HCM | 319 |
| Tuyến Hà Nội | 374 |

View `v_route_stops` tổng hợp dữ liệu tuyến và điểm dừng cho các truy vấn giao thông. Hàm tiện ích `nearest_stops(lat, lon, feed_id, limit)` trả về các điểm dừng gần nhất với tọa độ cho trước bằng khoảng cách haversine.

### 3.4 Cho thuê phương tiện

Miền cho thuê định nghĩa phân loại phương thức di chuyển trong cơ sở dữ liệu. Dữ liệu chi tiết về cửa hàng và phương tiện được quản lý dưới dạng CSV và phục vụ qua API.

| bảng | các trường chính |
|---|---|
| `transport_modes` | mode_id, code (enum), name, is_gtfs |

Mã phương thức cho thuê được hỗ trợ: `MOTORBIKE_RENTAL`, `CAR_RENTAL`. Dữ liệu khởi tạo cũng định nghĩa các phương thức `BUS`, `METRO`, `WALK`, `RIDE_HAILING`, `TRAIN` và `FERRY` cho sử dụng trong tương lai. Các nhà cung cấp đặt xe đang hoạt động được khởi tạo bao gồm Grab, Be và Xanh SM.

| file | số hàng (không tính header) | mô tả |
|---|---|---|
| `rental_shops.csv` | 12 | ID cửa hàng, tên, thành phố, quận, lat/lng, hạng, loại phương tiện |
| `vehicles_cars.csv` | 1.768 | hãng, model, động cơ, mã lực, tốc độ tối đa, nhiên liệu, chỗ ngồi, giá, hạng |
| `vehicles_motorbikes.csv` | 38.772 | hãng, model, công suất, số km, nhiên liệu, hộp số, loại đề xuất, giá, hạng, năm |
| `shop_inventory.csv` | 18.133 | mapping phương tiện–cửa hàng với giá thuê theo ngày (USD), đơn vị có sẵn, tình trạng |
| `rental_recommendations_flat.csv` | 18.133 | join phi chuẩn hóa tất cả các file trên phục vụ truy vấn nhanh |

**Hạng cho thuê:** Budget · Mid-Range · Premium · Luxury · Ultra-Luxury · High-End

**Thành phố phủ sóng:** Thành phố Hồ Chí Minh (Quận 1, 3, 7, Bình Thạnh, Tân Bình, Gò Vấp), Hà Nội (Hoàn Kiếm, Ba Đình, Đống Đa, Cầu Giấy, Long Biên, Tây Hồ).

---

## 4. Triển khai kỹ thuật

### 4.1 Thiết kế schema

Schema `trip_db` được triển khai trên PostgreSQL và tổ chức xung quanh ba miền MVP. Tất cả khóa chính sử dụng định danh `character(10)` độ dài cố định (ví dụ: `DST0000001` cho điểm đến, `FEED000001` cho GTFS feed) để đảm bảo tham chiếu ổn định giữa các bảng. Các bảng con GTFS cascade xóa từ `gtfs_feeds`, vì vậy khi xóa một bản ghi feed sẽ tự động dọn sạch tất cả agency, tuyến, điểm dừng, chuyến đi và giờ dừng liên quan.

Schema định nghĩa hai đối tượng đáng chú ý ngoài các bảng cốt lõi:

- **`v_route_stops`** — view join `gtfs_routes`, `gtfs_trips`, `gtfs_stop_times` và `gtfs_stops` để tạo ra biểu diễn phẳng về các điểm dừng thuộc tuyến nào. Đây là bề mặt truy vấn chính cho tra cứu điểm dừng giao thông.
- **`nearest_stops(lat, lon, p_feed, lim)`** — hàm SQL tính khoảng cách xấp xỉ bằng định lý cosin cầu và trả về `lim` điểm dừng gần nhất trong một feed cho trước. Cách này tránh cần extension PostGIS trong MVP.

### 4.2 Ràng buộc schema

Các quy tắc miền được thực thi ở tầng cơ sở dữ liệu cho các bảng MVP:

| quy tắc | ràng buộc |
|---|---|
| rating_avg điểm đến | `0 ≤ rating_avg ≤ 5` |
| mã phương thức di chuyển | enum các giá trị được phép |
| toàn vẹn tham chiếu GTFS | stop times tham chiếu trips và stops hợp lệ; trips tham chiếu routes hợp lệ |

### 4.3 Index

Các index chính định nghĩa trong `schema.sql` cho hiệu năng truy vấn MVP:

| đích index | mục đích |
|---|---|
| `destinations(category)`, `destinations(name)` | duyệt theo danh mục và tìm kiếm theo tên |
| `gtfs_stops(stop_lat, stop_lon)` | truy vấn điểm dừng gần nhất theo tọa độ |
| `gtfs_stop_times(trip_id)`, `gtfs_stop_times(stop_id)` | join giờ dừng để tái tạo tuyến |
| `gtfs_trips(route_id)` | tra cứu tuyến-chuyến đi |

### 4.4 Tạo GTFS feed

Dữ liệu GTFS không được tải từ các nguồn cơ quan chính thức mà được tạo ra từ dữ liệu OpenStreetMap thông qua gói `public transport/vietnam-gtfs/`, truy vấn Overpass API. Đầu ra dự kiến cho mỗi thành phố là:

```
agency.txt
routes.txt
stops.txt
trips.txt
stop_times.txt
calendar.txt
shapes.txt
feed_info.txt
```

Các file này được đóng gói thành `gtfs.zip` và nạp vào các bảng `gtfs_*` qua `gtfs_loader.py` với `feed_id` riêng cho từng thành phố. Thiết kế đa feed cho phép dữ liệu xe buýt, tàu điện và tàu hỏa của Hà Nội và TP.HCM cùng tồn tại trong cùng một schema mà không cần nhân bảng.

### 4.5 Pipeline dữ liệu cho thuê

Pipeline CSV cho thuê tạo ra file `rental_recommendations_flat.csv` phi chuẩn hóa bằng cách join thuộc tính phương tiện (hãng, model, thông số, hạng) với metadata cửa hàng (vị trí, hạng cửa hàng) và bản ghi kho hàng (giá theo ngày, số lượng có sẵn, tình trạng). File phẳng này phù hợp cho phục vụ API trực tiếp hoặc lọc phân tích mà không cần join SQL tại thời điểm truy vấn.

---

## 5. Pipeline ETL

### 5.1 Thu thập (Extract)

- **Điểm đến:** scrape qua công cụ gosom Google Maps scraper [2].
- **GTFS feed:** tạo từ dữ liệu OpenStreetMap Overpass API qua gói `public transport/vietnam-gtfs/`, do dữ liệu GTFS của Việt Nam không được công bố công khai theo hiểu biết của chúng tôi.
- **Dữ liệu cho thuê:** bộ dữ liệu CSV được tuyển chọn cho cửa hàng, ô tô và xe máy, phục vụ qua API.

### 5.2 Chuyển đổi (Transform)

- Dữ liệu POI được chuẩn hóa vào `destinations` với danh mục, tọa độ và trường rating theo định dạng chuẩn.
- File GTFS được phân tích và gắn `feed_id` để hỗ trợ nhiều thành phố trong một schema.
- Dữ liệu CSV cho thuê được phi chuẩn hóa thành `rental_recommendations_flat.csv` để tăng hiệu quả truy vấn.

### 5.3 Nạp dữ liệu (Load)

| artifact | mục đích |
|---|---|
| `schema.sql` | tạo tất cả bảng, ràng buộc, view và hàm |
| `data.sql` | nạp hàng loạt 1.847 bản ghi điểm đến và khởi tạo transport modes và GTFS feed |
| `gtfs_loader.py` | upsert GTFS feed vào các bảng `gtfs_*` |

Tất cả loader hỗ trợ chạy lặp lại mà không làm hỏng dữ liệu nhờ logic upsert.

---

## 6. Hạn chế đã biết

Các vấn đề sau được xác định trong triển khai MVP hiện tại:

1. **Bảng `destination_aspects` còn thiếu.** Các tài liệu thiết kế trước đó tham chiếu bảng này nhưng nó không được định nghĩa trong `schema.sql`. Cần thêm bảng vào schema hoặc xử lý aspects như metadata dẫn xuất trong cấu trúc JSONB của `destination_triples`. [TODO: quyết định và giải quyết trước khi phát triển post-MVP]

2. **GTFS feed có thể thiếu dữ liệu lịch trình.** Do feed được tạo từ OSM thay vì xuất từ cơ quan chính thức, một số tuyến có thể thiếu chuỗi giờ dừng đầy đủ hoặc dữ liệu hình học tuyến. Hành vi lập lịch trình cần tính đến feed không đầy đủ và phân biệt tuyến có lịch với tuyến chỉ có dữ liệu hình học.

3. **Dữ liệu CSV cho thuê không có ràng buộc ở tầng cơ sở dữ liệu.** Kho hàng cửa hàng và bản ghi phương tiện được lưu dưới dạng file phẳng mà không có toàn vẹn tham chiếu, ràng buộc duy nhất hoặc kiểm tra tiền tệ. Điều này chấp nhận được cho phục vụ API MVP nhưng cần xem xét lại nếu cần cập nhật giao dịch hoặc join liên miền.

4. **Dữ liệu seed provider-to-mode có tham chiếu sai.** Trong `data.sql`, các nhà cung cấp đặt xe tham chiếu `MODE000006` (được seed là `CAR_RENTAL`) thay vì mode `RIDE_HAILING` đúng. Các placeholder nhà cung cấp cho thuê xe máy và ô tô cũng tham chiếu sai mode ID. Cần sửa trước khi dùng join provider-mode trong các tính năng định tuyến post-MVP.

---

## 7. Ngoài phạm vi MVP

Các hạng mục sau được hoãn lại cho post-MVP:

- quản lý tài khoản và sở thích người dùng (ngoài phục vụ gợi ý cho thuê)
- lập kế hoạch và quản lý chuyến đi
- tính toán lộ trình và chấm điểm phương án
- mô hình RAG đầy đủ để gợi ý phương thức di chuyển
- đánh giá và gợi ý điểm đến
- GTFS-RT thời gian thực hoặc dữ liệu giao thông trực tiếp
- tích hợp API đặt xe trực tiếp
- ứng dụng di động

---

## 8. Kết luận

MVP này thiết lập nền tảng dữ liệu thống nhất trên ba miền: dữ liệu điểm đến có cấu trúc cho Thành phố Hồ Chí Minh và Hà Nội, giao thông công cộng GTFS bao phủ hơn 11.000 điểm dừng và 693 tuyến tại cả hai thành phố, và thị trường cho thuê phương tiện phục vụ qua API. Cùng nhau, chúng tạo thành một backend nhất quán có thể hỗ trợ các tính năng gợi ý và định tuyến trong các vòng lặp hệ thống tiếp theo.

---

## Tài liệu tham khảo

[1] Google Developers, "GTFS Reference," *General Transit Feed Specification*. [Online]. Available: https://gtfs.org. [Accessed: Tháng 5 năm 2026].

[2] G. Kostopoulos, "google-maps-scraper," *GitHub*. [Online]. Available: https://github.com/gosom/google-maps-scraper. [Accessed: Tháng 5 năm 2026].

---

## Phụ lục A: Danh sách bảng MVP đầy đủ

`users` · `user_preferences` · `destinations` · `transport_modes` · `gtfs_feeds` · `gtfs_agency` · `gtfs_routes` · `gtfs_stops` · `gtfs_trips` · `gtfs_stop_times` · `gtfs_calendar` · `v_route_stops` (view)

## Phụ lục B: Vị trí cửa hàng cho thuê

| cửa hàng | thành phố | quận | loại phương tiện | hạng |
|---|---|---|---|---|
| Saigon Wheels Hub | TP.HCM | Quận 1 | ô tô, xe máy | Budget, Mid-Range |
| DriveVN Premium | TP.HCM | Bình Thạnh | ô tô | Mid-Range, Luxury |
| Moto Saigon | TP.HCM | Quận 3 | xe máy | Budget – Premium |
| Airport Ride HCMC | TP.HCM | Tân Bình | ô tô, xe máy | Mid-Range, Luxury |
| Luxe Drive Saigon | TP.HCM | Quận 7 | ô tô | Luxury – Ultra-Luxury |
| Phuong Nam Rentals | TP.HCM | Gò Vấp | ô tô, xe máy | Budget, Mid-Range |
| Hanoi Explorer Rentals | Hà Nội | Hoàn Kiếm | ô tô, xe máy | Budget, Mid-Range |
| Capital Drive VN | Hà Nội | Ba Đình | ô tô | Mid-Range, Luxury |
| Thang Long Moto | Hà Nội | Đống Đa | xe máy | Budget – Premium |
| West Lake Wheels | Hà Nội | Cầu Giấy | ô tô, xe máy | Mid-Range, Luxury |
| Noi Bai Connect Rentals | Hà Nội | Long Biên | ô tô | Budget – Luxury |
| Tay Ho Premium Rides | Hà Nội | Tây Hồ | ô tô, xe máy | Luxury – High-End |