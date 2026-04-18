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
- **Bước 3:** Chạy đoạn dưới đây vào một cell
```python
import os
import nest_asyncio
import threading
import uvicorn
import tixme
import subprocess
import re
from google.colab import userdata

# 1. Clone code từ Github
!git clone [Link git](Link git)
%cd /[Đường dẫn]/ai/efm_service

# 2. Tự động sắp xếp lại thư mục Data cho đúng chuẩn
%cd data
!mkdir -p efm_model_final
!mv 20*.pkl efm_model_final/ 2>/dev/null || true
!mv 20*.pkl.meta efm_model_final/ 2>/dev/null || true
%cd ..

# 3. Cài đặt thư viện
!pip install -q -r requirements.txt

# 4. Dọn dẹp mạng và nạp API Key
!fuser -k 8000/tcp
nest_asyncio.apply()

try:
    os.environ["GROQ_API_KEY"] = userdata.get('GROQ_API_KEY')
    print(" Đã nạp API Key thành công!")
except:
    print(" LỖI: Chưa có GROQ_API_KEY trong mục Secrets!")

# 5. Khởi động Server và Pinggy
def run_app():
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)

if "GROQ_API_KEY" in os.environ:
    print("Đang khởi động EFM Server...")
    server_thread = threading.Thread(target=run_app)
    server_thread.start()
    time.sleep(5)

    print("Đang bắt kết nối Pinggy...")
    log_file = "pinggy.log"
    cmd = "ssh -o StrictHostKeyChecking=no -p 443 -R0:localhost:8000 a.pinggy.io > pinggy.log 2>&1"
    subprocess.Popen(cmd, shell=True)
    time.sleep(3)

    # Đọc và lấy link
    with open(log_file, "r") as f:
        urls = re.findall(r'https?://[a-zA-Z0-9-]+\.a\.pinggy\.io', f.read())
        if urls:
            print("\n" + "="*60)
            print("TÌM THẤY LINK! BẤM VÀO ĐÂY ĐỂ TEST API:")
            print(f"{urls[0]}/docs")
            print("="*60)
```
## Danh sách API chính
### 1.Gợi ý địa điểm
- **Endpoint:** POST /api/recommend
- **Mô tả:** Nhập ID người dùng, AI sẽ trả về Top K địa điểm phù hợp nhất kèm theo lời giải thích ưu/nhược điểm được sinh ra bởi LLaMA 3.1.
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