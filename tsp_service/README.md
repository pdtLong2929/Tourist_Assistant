# TSP Service - Tourist Assistant AI

## Cơ chế

### Kiến trúc
- **TSP Optimization Core:** Sử dụng mô hình Deep Learning (Pointer Network) để tìm ra tuyến đường tối ưu cho các điểm đến
- **Input:** Tọa độ GPS của điểm xuất phát và các điểm đến
- **Output:** Danh sách các điểm theo thứ tự tối ưu với tổng khoảng cách ngắn nhất (open-tour TSP)
- **Model:** PyTorch pretrained model với kiến trúc Attention-based Pointer Network

### Các chế độ chạy
- **Chế độ REST API:** Chỉ cung cấp HTTP endpoints, không có PubSub worker
- **Chế độ REST API + PubSub Worker:** Vừa có HTTP endpoints vừa xử lý request từ Pub/Sub

---

## Hướng dẫn cài đặt & chạy

### Bước 1: Chuẩn bị môi trường

**Chú ý:** Mở terminal tại thư mục `tsp_service`

```bash
# Tạo môi trường ảo (Python 3.12 khuyến nghị)
py -m venv venv
# Hoặc chỉ rõ phiên bản
py -3.12 -m venv venv

# Kích hoạt môi trường (Windows)
.\venv\Scripts\activate

# Nâng cấp pip
python -m pip install --upgrade pip

# Cài đặt dependencies
pip install -r requirements.txt
```

### Bước 2: Chuẩn bị mô hình

- Đảm bảo file trọng số `epoch-99.pt` được đặt trong thư mục `tsp_service/pretrained/`
- Thư mục `pretrained/` phải chứa file `args.json` với cấu hình mô hình

### Bước 3: Tạo file `.env` (Optional)

Tạo file `.env` tại thư mục gốc `tsp_service/` (cùng cấp với thư mục `app`):

```plaintext
# Cấu hình Pub/Sub
# - Nếu KHÔNG dùng PubSub worker: ENABLE_PUBSUB_WORKER=false (mặc định)
# - Nếu dùng PubSub worker: ENABLE_PUBSUB_WORKER=true
ENABLE_PUBSUB_WORKER=false
PUBSUB_REQUEST_SUBSCRIPTION=tsp-request-sub
PUBSUB_RESPONSE_TOPIC=tsp-response
```

### Bước 4: Khởi động server

#### **Chế độ 1: Chỉ REST API (không PubSub)**

```bash
uvicorn app.main:app --port 8001 --reload
```

#### **Chế độ 2: REST API + PubSub Worker**

Thêm `ENABLE_PUBSUB_WORKER=true` vào file `.env`, sau đó chạy:

```bash
uvicorn app.main:app --port 8001 --reload
```

---

## API Endpoints

### 1. Root / Status Check
```
GET /
```
Trả về thông tin server và trạng thái của TSP service

### 2. Health Check
```
GET /health
```
Kiểm tra xem mô hình PyTorch có sẵn sàng hay không

### 3. Tối ưu tuyến đường (Predict)
```
POST /predict
```
**Request body:**
```json
{
  "start_location": {
    "id": 0,
    "x": 106.7,
    "y": 10.8
  },
  "destinations": [
    {
      "id": 1,
      "x": 106.8,
      "y": 10.9
    },
    {
      "id": 2,
      "x": 106.75,
      "y": 10.85
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "start_point_id": 0,
  "total_locations": 3,
  "total_distance": 0.2345,
  "optimized_route": [
    {
      "id": 0,
      "x": 106.7,
      "y": 10.8
    },
    {
      "id": 1,
      "x": 106.8,
      "y": 10.9
    },
    {
      "id": 2,
      "x": 106.75,
      "y": 10.85
    }
  ]
}
```

### Truy cập Swagger UI
```
http://localhost:8001/docs
```

---

## Cấu hình Pub/Sub (Optional)

### Mặc định
**Mặc định:** PubSub worker là TẮT (`ENABLE_PUBSUB_WORKER=false`). Server chỉ chạy REST API.

### Để dùng PubSub worker

1. Đảm bảo credentials Google Cloud được cấu hình:
   - Set environment variable `GOOGLE_APPLICATION_CREDENTIALS` trỏ đến file JSON credentials
   - Hoặc sử dụng Application Default Credentials (ADC)

2. Cập nhật file `.env`:
   ```plaintext
   ENABLE_PUBSUB_WORKER=true
   PUBSUB_REQUEST_SUBSCRIPTION=tsp-request-sub
   PUBSUB_RESPONSE_TOPIC=tsp-response
   ```

3. Khởi động server, worker sẽ tự động chạy trên thread riêng

### Định dạng message Pub/Sub

**Request message:**
```json
{
  "job_id": "job_123",
  "user_id": "user_456",
  "action": "predict",
  "payload": {
    "start_location": {"id": 1, "x": 106.7, "y": 10.8},
    "destinations": [
      {"id": 2, "x": 106.8, "y": 10.9}
    ]
  }
}
```

**Response message:**
```json
{
  "job_id": "job_123",
  "user_id": "user_456",
  "status": "success",
  "data": {
    "optimized_route": [...],
    "total_distance": 0.2345
  }
}
```

---

## Khắc phục sự cố

### Model File Not Found
- Kiểm tra file `epoch-99.pt` có tồn tại trong `tsp_service/pretrained/`
- Đảm bảo file `args.json` cũng có trong thư mục đó

### Model Not Ready Error
- Lỗi 503 từ `/health` endpoint nghĩa là mô hình chưa load xong
- Kiểm tra console để xem chi tiết lỗi

### PyTorch CUDA Issues (GPU)
- Nếu có GPU nhưng gặp lỗi CUDA, kiểm tra phiên bản PyTorch phù hợp
- Có thể force CPU bằng cách sửa code hoặc thiết lập environment

---

## Requirements
- Python 3.12
- FastAPI 0.110.0
- Uvicorn 0.27.1
- PyTorch >= 2.2.1
- NumPy >= 1.26.0
- Xem file `requirements.txt` để danh sách đầy đủ