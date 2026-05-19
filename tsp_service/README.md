# Kiến trúc
- **input**: tọa độ các địa điểm
``` json
{
  "start_location": {
    "id": 0,
    "x": 0,
    "y": 0
  },
  "destinations": [
    {
      "id": 0,
      "x": 0,
      "y": 0
    }
  ]
}
```
- **output**: danh sách với thứ tự tối ưu
```json
{
  "status": "success",
  "start_point_id": 0,
  "total_locations": 2,
  "total_distance": 0,
  "optimized_route": [
    {
      "id": 0,
      "x": 0,
      "y": 0
    },
    {
      "id": 0,
      "x": 0,
      "y": 0
    }
  ]
}
```

# Hướng dẫn chạy
- **Bước 1:** Chuẩn bị môi trường
- **Chú ý:** mở terminal tại thư mục tsp_service
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
- **Bước 2:** Đảm bảo file trọng số epoch-99.pt đã được đặt vào đúng thư mục pretrained/.
- **Bước 3:** Khởi động server
``` bash
uvicorn app.main:app --port 8001 --reload
```
- Truy cập http://localhost:8001/docs để sử dụng Swagger UI