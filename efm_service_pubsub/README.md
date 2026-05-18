# EFM Service - Tourist Assistant AI

## Cơ chế

### Kiến trúc
- **EFM Core:** Nhận vào user_id, item_id/top_k, sử dụng efm_mapping để tìm dòng tương ứng trong ma trận trọng số (efm_model_final.pkl) và nhân vector user × item để dự đoán rating
- **Mock Database:** Dựa vào các khía cạnh người dùng quan tâm, tìm kiếm trong database để lấy các opinion của aspect (từ review cũ)
- **LLaMA:** Gửi aspect-opinion cho LLaMA để sinh lời giải thích cá nhân hóa cho từng user

### Các chế độ chạy
- **Chế độ REST API:** Chỉ cung cấp HTTP endpoints, không có PubSub worker
- **Chế độ REST API + PubSub Worker:** Vừa có HTTP endpoints vừa xử lý request từ Pub/Sub

---

## Hướng dẫn cài đặt & chạy

### Bước 1: Chuẩn bị môi trường

**Chú ý:** Mở terminal tại thư mục `efm_service`

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

### Bước 2: Chuẩn bị dữ liệu mô hình

- Đảm bảo file trọng số `efm_model_final.pkl` được đặt trong thư mục `efm_service/data/`
- Thư mục `data/` phải chứa các file ánh xạ cần thiết cho mô hình

### Bước 3: Tạo file `.env`

Tạo file `.env` tại thư mục gốc `efm_service/` (cùng cấp với thư mục `app`):

```plaintext
# Required: Groq API key cho LLaMA
GROQ_API_KEY=gsk_your_actual_key_here

# Optional: Cấu hình Pub/Sub
# - Nếu KHÔNG dùng PubSub worker: ENABLE_PUBSUB_WORKER=false (mặc định)
# - Nếu dùng PubSub worker: ENABLE_PUBSUB_WORKER=true
ENABLE_PUBSUB_WORKER=false
PUBSUB_REQUEST_SUBSCRIPTION=model-request-sub
PUBSUB_RESPONSE_TOPIC=model-response
EFM_RECOMMEND_CANDIDATE_LIMIT=1000
```

### Bước 4: Khởi động server

#### **Chế độ 1: Chỉ REST API (không PubSub)**

```bash
uvicorn app.main:app --port 8000 --reload
```

#### **Chế độ 2: REST API + PubSub Worker**

Thêm `ENABLE_PUBSUB_WORKER=true` vào file `.env`, sau đó chạy:

```bash
uvicorn app.main:app --port 8000 --reload
```

---

## API Endpoints

### 1. Health Check
```
GET /
```
Trả về trạng thái server và thông tin worker PubSub

### 2. Dự đoán rating (Predict)
```
POST /api/predict
```
**Request body:**
```json
{
  "user_id": "user_123",
  "item_ids": ["dest_001", "dest_002", "dest_003"]
}
```

**Response:**
```json
{
  "data": [
    {
      "item_id": "dest_001",
      "predicted_rating": 4.5,
      "explanation": "Bạn sẽ thích nơi này vì..."
    }
  ]
}
```

### 3. Gợi ý Top-K địa điểm (Recommend)
```
POST /api/recommend
```
**Request body:**
```json
{
  "user_id": "user_123",
  "city": "HCMC",
  "top_k": 5
}
```

**Response:**
```json
{
  "data": [
    {
      "destination_id": "dest_001",
      "rating": 4.8,
      "explanation": "Top 1 gợi ý cho bạn vì..."
    }
  ]
}
```

### Truy cập Swagger UI
```
http://localhost:8000/docs
```

---

## Cấu hình Pub/Sub (Optional)

### Kích hoạt PubSub Worker

**Mặc định:** PubSub worker là TẮT (`ENABLE_PUBSUB_WORKER=false`). Server chỉ chạy REST API.

**Để dùng PubSub worker:**

1. Đảm bảo credentials Google Cloud được cấu hình:
   - Set environment variable `GOOGLE_APPLICATION_CREDENTIALS` trỏ đến file JSON credentials
   - Hoặc sử dụng Application Default Credentials (ADC)

2. Cập nhật file `.env`:
   ```plaintext
   ENABLE_PUBSUB_WORKER=true
   PUBSUB_REQUEST_SUBSCRIPTION=model-request-sub
   PUBSUB_RESPONSE_TOPIC=model-response
   ```

3. Khởi động server, worker sẽ tự động chạy trên thread riêng

### Định dạng message Pub/Sub

**Request message:**
```json
{
  "job_id": "job_123",
  "user_id": "user_456",
  "action": "recommend",
  "payload": {
    "city": "HCMC",
    "top_k": 5
  }
}
```

**Response message:**
```json
{
  "job_id": "job_123",
  "user_id": "user_456",
  "status": "success",
  "data": [...]
}
```

---

## Khắc phục sự cố

### NumPy Compatibility Error
- Nếu gặp lỗi liên quan NumPy `_core`, main.py đã có code patch tự động

### Groq API Key
- Đảm bảo `GROQ_API_KEY` hợp lệ trong file `.env`
- Key phải bắt đầu bằng `gsk_`

### Model File Not Found
- Kiểm tra file `efm_model_final.pkl` có tồn tại trong `efm_service/data/`

---

## Requirements
- Python 3.12
- FastAPI 0.110.0
- Uvicorn 0.27.1
- Groq API client
- Google Cloud Pub/Sub client
- Xem file `requirements.txt` để danh sách đầy đủ