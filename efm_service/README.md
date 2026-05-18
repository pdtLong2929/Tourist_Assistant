# Cơ chế
## Kiến trúc
- **EFM core:** nhận vào user id, item id/ top_k, dùng efm_mapping để tìm dòng tương ứng trong ma trận trọng số efm_model_final.pkl (U1) và nhân 2 vector user x item để cho ra predict rating 
- **Mock database:** Dựa vào các khía cạnh người dùng quan tâm, tìm kiếm trong database để xem các opinion của aspect user đang xét quan tâm (từ những review cũ)
- **LLaMA:** gửi apsect-opinion cho LLaMA để sinh lời giải thích cho từng user (dựa trên khía cạnh mà người đó quan tâm)

# Hướng dẫn chạy
- **Bước 1:** Chuẩn bị môi trường
- **Chú ý:** mở terminal tại thư mục efm_service
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
- **Bước 2:** Đảm bảo file trọng số .pkl được đặt vào thư mục data/
- **Bước 3:** Tạo file .env
1) Tạo file .env cùng cấp với app
2) Thêm dòng sau vào file
``` Plaintext
GROQ_API_KEY=gsk_your_actual_key_here
``` 
- **Bước 4:** Khởi động server
``` bash
uvicorn app.main:app --port 8000 --reload
```
- Truy cập http://localhost:8000/docs để sử dụng Swagger UI