# Hướng dẫn chạy
## Cách 1: Local
- **Bước 1:** Cài thư viện
``` bash
pip install -r requirements.txt
```
- **Bước 2:** Đảm bảo file trọng số .pkl được đặt vào thư mục data/
- **Bước 3:** Cấp quyền API Key cho LLaMA
``` bash
# Windows (CMD)
set GROQ_API_KEY=gsk_your_key_here

# Linux / Mac
export GROQ_API_KEY='gsk_your_key_here'
```
- **Bước 4:** Khởi động server
``` bash
uvicorn app.main:app --port 8000 --reload
```
- Truy cập http://localhost:8000/docs để sử dụng Swagger UI
## Cách 2: Chạy thử bằng GG Colab + Pinggy
- **Bước 1:** Mở new notebook trên GG Colab
- **Bước 2:** Thêm Key GROQ_API_KEY vào mục Secrets
- **Bước 3:** Chạy các đoạn dưới đây vào các cell
```python
# 1. Clone code và di chuyển vào thư mục
!git clone [https://github.com/LuftNguyen/My_test_repo.git](https://github.com/LuftNguyen/My_test_repo.git)
%cd /content/My_test_repo/ai/efm_service

# 2. Sửa lỗi lệch phiên bản Numpy của Colab và cài thư viện
!pip install -q "numpy<2.0.0"
!pip install -q -r requirements.txt

# 3. In ra danh sách ID hợp lệ để test
import pickle
with open('data/efm_mapping.pkl', 'rb') as f:
    mapping = pickle.load(f)

print("\n" + "="*50)
print("🎯 BẠN HÃY COPY CÁC ID DƯỚI ĐÂY ĐỂ DÙNG LÚC TEST:")
print("👤 5 User ID hợp lệ:", list(mapping['uid_map'].keys())[:5])
print("📍 5 Item ID hợp lệ:", list(mapping['iid_map'].keys())[:5])
print("="*50)
```
``` python
import os
import time

%cd /content/My_test_repo/ai/efm_service

print("Đang khởi tạo đường hầm Pinggy chạy ngầm...")
# Chạy ssh ngầm bằng nohup
os.system("nohup ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:8000 a.pinggy.io > pinggy.log 2>&1 &")
time.sleep(5)

if os.path.exists("pinggy.log"):
    with open("pinggy.log", "r") as f:
        print("\n" + "="*70)
        print(f.read())
        print("="*70)
        print("👉 LƯU LẠI LINK CÓ ĐUÔI .a.pinggy.io VÀ CHUYỂN SANG CHẠY CELL 3!")
```
``` python
import os
from google.colab import userdata

%cd /content/My_test_repo/ai/efm_service

# Nạp chìa khóa vào môi trường
try:
    os.environ["GROQ_API_KEY"] = userdata.get('GROQ_API_KEY')
    print("✅ Đã nạp API Key thành công!")
except:
    print("❌ LỖI: Bạn chưa tạo Secret tên GROQ_API_KEY hoặc chưa bật quyền!")

# Khởi động server trực tiếp ở Foreground (Luồng chính)
!uvicorn app.main:app --host 0.0.0.0 --port 8000
```
## Danh sách API chính
### 1.Gợi ý địa điểm
- **Endpoint:** POST /api/recommend
- **Mô tả:** Nhập ID người dùng, AI sẽ trả về Top K địa điểm phù hợp nhất kèm theo lời giải thích ưu/nhược điểm được sinh ra bởi LLaMA.
- **Body:** 
``` json
{
  "user_id": "test_user_123",
  "top_k": 5
}
```
### 2.Dự đoán điểm số và Giải thích
- **Endpoint:** POST /api/predict
- **Mô tả:** Nhập ID người dùng và 1 danh sách địa điểm cụ thể, AI sẽ dự đoán xem người dùng này sẽ chấm bao nhiêu điểm cho từng địa điểm đó kèm theo lời giải thích ưu/nhược điểm được sinh ra bởi LLaMA 3.1.
- **Body:**
``` json
{
  "user_id": "test_user_123",
  "item_ids": ["Place_A", "Place_B"]
}
```
## Cách lấy User ID và Item ID để test API
```python
import pickle

with open('data/efm_mapping.pkl', 'rb') as f:
    mapping = pickle.load(f)

print("5 User ID hợp lệ:", list(mapping['uid_map'].keys())[:5])
print("5 Item ID hợp lệ:", list(mapping['iid_map'].keys())[:5])
```