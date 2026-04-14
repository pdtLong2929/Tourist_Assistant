# Hướng dẫn chạy
## Cách 1: Local
- **Bước 1:** Cài thư viện
``` bash
pip install -r requirements.txt
```
- **Bước 2:** Đảm bảo file trọng số epoch-99.pt đã được đặt vào đúng thư mục pretrained/.
- **Bước 3:** Khởi động server
``` bash
uvicorn app.main:app --port 8001 --reload
```
- Truy cập http://localhost:8001/docs để sử dụng Swagger UI
## Cách 2: Chyaj thử bằng GG Colab + Pinggy
- **Bước 1:** Mở new notebook trên GG Colab
- **Bước 2:** Chạy đoạn dưới đây vào một cell
\`\`\`python
import os
import nest_asyncio
import threading
import uvicorn
import time
import subprocess
import re

# 1. Clone code từ Github
!git clone [link git](link git)
%cd /.../ai/tsp_service

# 2. Cài đặt thư viện
!pip install -q -r requirements.txt

# Nếu file epoch-99.pt của bạn quá nặng không đẩy lên GitHub được,
# bạn phải MỞ THANH BÊN TRÁI của Colab và UPLOAD THỦ CÔNG file epoch-99.pt 
# vào thư mục /.../ai/tsp_service/pretrained/ trước khi server chạy.
!mkdir -p pretrained
# ------------------------

# 3. Dọn dẹp mạng
!fuser -k 8000/tcp
nest_asyncio.apply()

# 4. Khởi động Server và Pinggy
def run_app():
    # Nhánh TSP dùng app:app thay vì app.main:app
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)

print("Đang khởi động TSP Server...")
server_thread = threading.Thread(target=run_app)
server_thread.start()
time.sleep(8) # Đợi lâu hơn một chút vì PyTorch load model khá nặng

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
    else:
        print("Chưa tìm thấy link, bạn thử chạy lại Cell này nhé.")
\`\`\`
## Danh sách API chính
### 1.Tối ưu lộ trình
- **Endpoint:** POST /predict
- **Mô tả:** Nhận vào điểm xuất phát và danh sách các điểm đến. Trả về lộ trình tối ưu nhất kèm theo tổng khoảng cách (đã được AI tính toán).
- **Body:** 
``` json
{
  "start_location": {
"id": 0,
"x": 10.762622,
"y": 106.660172
},
"destinations": [
{
"id": 1,
"x": 10.776889,
"y": 106.700806
},
{
"id": 2,
"x": 10.792345,
"y": 106.671234
}
]
}
```
