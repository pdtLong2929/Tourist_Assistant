## Tính năng 
- **Thuật toán Scoring 5 tiêu chí:** Xếp hạng tuyến đường dựa trên: Tỷ lệ phủ điểm đến (40%), Khoảng cách đi bộ (20%), Số lần đổi tuyến (15%), Đi đúng hướng TSP (10%), và Thời gian di chuyển (15%).
- **Multi-city Support:** Hỗ trợ linh hoạt nhiều thành phố cùng lúc (Hà Nội, TP.HCM,...) chỉ bằng cách truyền tham số `city` vào API.
- **Pure Python:** Thuật toán tính toán không gian (Spatial calculation) và routing được xây dựng bằng Python thuần 

## Hướng dẫn cài đặt
**Bước 1:** Tạo thư mục data cùng cấp với app và chuẩn bị gtfs_hn và gtfs_hcmc trong thư mục data, lấy trong link sau:
[https://drive.google.com/drive/u/0/folders/1e5s1h44qkmZe7G280C-nAOO8kIaB_xWK](https://drive.google.com/drive/u/0/folders/1e5s1h44qkmZe7G280C-nAOO8kIaB_xWK)

**Bước 2:** Chuẩn bị môi trường
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
uvicorn app.main:app --port 8002 --reload
```
- Truy cập http://localhost:8002/docs để sử dụng Swagger UI

## Các Endpoints chính:

#### 1. POST `/transit/suggest` (Quan trọng nhất)
Gửi lên một danh sách các địa điểm (tọa độ), nhận về top các cách đi xe buýt tốt nhất.
**Chú ý:** Cần xác định được địa điểm thuộc khu vực nào (city)
**Input Example:**
```json
{
  "city": "hcmc",
  "locations": [
    {"name": "Bến Thành", "lat": 10.7716, "lon": 106.6983},
    {"name": "Dinh Độc Lập", "lat": 10.7770, "lon": 106.6953}
  ],
  "top_k": 3,
  "max_walk_meters": 500,
  "combine_routes": true
}
```

#### 2. GET `/transit/{city}/routes`
Lấy danh sách tất cả các tuyến xe buýt đang hoạt động tại thành phố được chọn.

#### 3. GET `/transit/{city}/routes/{route_id}`
Lấy thông tin tuyến xe qua route_id

#### 4. GET `/transit/{city}/routes/{route_id}/stops`
Lấy danh sách trạm dừng của tuyến xe theo route_id

#### 5. GET `/transit/{city}/stops`
Lấy danh sách tất cả trạm dừng của thành phố đã chọn

#### 6. GET `/transit/{city}/stops/{stop_id}`
Lấy thông tin của trạm dừng theo stop_id

## Test
### HCMC
```json
{
  "city": "hcmc",
  "locations": [
    {
      "lat": 10.7724,
      "lon": 106.6981
    },
    {
      "lat": 10.7950,
      "lon": 106.7218
    },
    {
      "lat": 10.8650,
      "lon": 106.8000
    },
    {
      "lat": 10.8782,
      "lon": 106.8063
    },
    {
      "lat": 10.8820,
      "lon": 106.8280
    }
  ],
  "top_k": 3,
  "max_walk_meters": 1500,
  "combine_routes": true
}
```


### HN
``` json
{
  "city": "hn",
  "locations": [
    {
      "lat": 21.028511,
      "lon": 105.852431 
    },
    {
      "lat": 21.027800,
      "lon": 105.825900
    },
    {
      "lat": 20.950000,
      "lon": 105.753200
    }
  ],
  "top_k": 3,
  "max_walk_meters": 1500,
  "combine_routes": true
}
```



