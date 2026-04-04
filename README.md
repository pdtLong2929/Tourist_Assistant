## 🗄️ Tổng quan thiết kế cơ sở dữ liệu – Smart Travelling System

Dự án này xây dựng cơ sở dữ liệu quan hệ sử dụng **PostgreSQL** nhằm phục vụ hệ thống *Smart Travelling System*, tập trung vào **cá nhân hóa trải nghiệm**, **lập kế hoạch chuyến đi**, và **so sánh phương tiện di chuyển**. Cơ sở dữ liệu đóng vai trò là nền tảng cho backend và các mô hình AI trong hệ thống.

---

## 🎯 Mục tiêu thiết kế

Cơ sở dữ liệu được xây dựng để đáp ứng các mục tiêu sau:

* Lưu trữ và quản lý **thông tin người dùng** và sở thích
* Hỗ trợ **lập kế hoạch chuyến đi (trip/itinerary)**
* Quản lý dữ liệu về **địa điểm (destinations)** và **đánh giá (reviews)**
* So sánh các **phương tiện di chuyển** (giao thông công cộng, Grab/Uber, …)
* Cung cấp dữ liệu cho **mô hình AI đề xuất (recommendation)**
* Ghi nhận kết quả để **đánh giá và cải thiện hệ thống**

---

## 🧠 Triết lý thiết kế

Khác với các hệ thống du lịch truyền thống (tích hợp booking và tính giá nội bộ), hệ thống này áp dụng hướng tiếp cận **nhẹ và tích hợp với bên ngoài**:

* **Không quản lý nội bộ xe hoặc hệ thống thuê xe**
* Các dịch vụ di chuyển được xem là **dịch vụ bên ngoài (external providers)**
* Giá và tuyến đường được **lấy từ API**, không tính toán trực tiếp trong hệ thống
* Tập trung vào **so sánh, tổng hợp và cá nhân hóa dữ liệu**

Hướng tiếp cận này phù hợp với mục tiêu chính của dự án: **hệ thống gợi ý thông minh dựa trên AI**, thay vì xây dựng nền tảng vận hành dịch vụ.

---

## 🧩 Các thành phần chính

Cơ sở dữ liệu được chia thành các module chính:

### 1. Người dùng & Sở thích

* Lưu thông tin người dùng và xác thực (password đã được hash)
* Lưu các sở thích như ngân sách, loại phương tiện, thói quen
* Phục vụ cho cá nhân hóa đề xuất

### 2. Địa điểm & Đánh giá

* Lưu thông tin các địa điểm (tên, loại, vị trí, mô tả)
* Cho phép người dùng đánh giá và nhận xét
* Hỗ trợ hệ thống ranking/gợi ý

### 3. Chuyến đi (Trips)

* Cho phép người dùng tạo kế hoạch du lịch
* Hỗ trợ nhiều điểm đến theo thứ tự
* Lưu thời gian và ngân sách dự kiến

### 4. So sánh phương tiện

* Lưu các nhà cung cấp (public transport, ride-hailing như Grab/Uber)
* Lưu yêu cầu so sánh tuyến đường
* Lưu nhiều phương án di chuyển (chi phí, thời gian, khoảng cách,…)

### 5. Log đề xuất AI

* Ghi lại input/output của mô hình AI
* Lưu version mô hình và ngữ cảnh
* Thu thập feedback từ người dùng để cải thiện hệ thống

---

## 🔐 Bảo mật

* Hệ thống **không lưu mật khẩu dạng plaintext**
* Chỉ lưu **password đã được hash** (bcrypt/Argon2)
* Việc xác thực được xử lý ở backend, không thực hiện trong SQL
* Các trường nhạy cảm như `password_hash` **không được trả về client**

---

## ⚙️ Ghi chú kỹ thuật

* Sử dụng **PostgreSQL**
* Dùng **JSONB** cho dữ liệu linh hoạt (preferences, AI output,…)
* Có các **constraint và index** để đảm bảo toàn vẹn dữ liệu và hiệu năng
* Thiết kế để tích hợp với:

  * **FastAPI backend**
  * API bên ngoài (maps, traffic, transport,…)

---

## 📌 Kết luận

Cơ sở dữ liệu được thiết kế nhằm hỗ trợ một hệ thống du lịch thông minh với các đặc điểm:

* **Linh hoạt** (thiết kế module, sử dụng JSONB)
* **Dễ mở rộng** (tách logic, tích hợp API ngoài)
* **Cá nhân hóa cao** (user preferences + AI logs)

Đây là nền tảng quan trọng để xây dựng hệ thống đề xuất du lịch thông minh, thích ứng với nhu cầu người dùng và điều kiện thực tế.
