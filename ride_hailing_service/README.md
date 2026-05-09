## Tính năng 
- **Multi-leg Estimation**: Tự động chia chặng và sinh `leg_id` dựa trên thứ tự mảng đầu vào (Stateless API).
- **Auto-Promotion Engine**: Thuật toán tìm kiếm tổ hợp mã giảm giá tốt nhất (Best Value Combo) để áp dụng cho khách hàng.
- **Smart Conditions (JSONB)**: Kiểm tra điều kiện áp mã linh hoạt thông qua cột JSON:
    - `location_type`: Chỉ áp dụng cho Sân bay, Trường học...
    - `min_fare`: Chỉ áp dụng cho các chuyến đi có giá trị tối thiểu nhất định.
    - `applicable_services`: Giới hạn mã cho từng hãng xe cụ thể (ví dụ: chỉ Grab).
- **Stateless Design**: API Single-leg cho phép xem chi tiết tất cả các hãng của chặng đó.
## Hướng dẫn cài đặt
**Bước 1:** Chuẩn bị môi trường
``` bash
# Tạo môi trường ảo
py -m venv venv
# Nếu không được hãy chỉ rõ
py -3.12 -m venv venv


# Kích hoạt môi trường (Windows)
.\venv\Scripts\activate


# Nâng cấp pip
python -m pip install --upgrade pip 


# Cài đặt thư viện
pip install -r requirements.txt
```

**Bước 3:** Chạy Server
```bash
uvicorn app.main:app --port 8003 --reload
```
- Truy cập http://localhost:8003/docs để sử dụng Swagger UI

## Các Endpoints chính:

#### 1. Tính giá đa chặng (Trang chủ)
- POST /ride/estimate

- Body: Truyền vào danh sách các chặng 

### 2. Xem chi tiết 1 chặng (Xem tất cả hãng)
- POST /ride/estimate/single

- Body: Truyền thông tin 1 chặng để lấy toàn bộ danh sách hãng xe đã được áp mã giảm giá.

## Test
### Đa chặng
```json
{
  "legs": [
    {
      "distance_km": 3,
      "location_type": "airport",
      "vehicle_category": "car"
    },
    {
      "distance_km": 30,
      "location_type": "airport",
      "vehicle_category": "car"
    }
  ],
  "top_k": 2
}
```
# Chi tiết chặng đó
- leg_id = leg_0_1
``` json
{
  "distance_km": 3,
  "location_type": "airport",
  "vehicle_category": "car"
}
```



