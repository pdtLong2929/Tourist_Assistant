# Hệ thống gợi ý phương tiện dựa trên yếu tố khách quan và yếu tố chủ quan của user

## Luồng hệ thống 

- Model nhận origin và destination dưới dạng {lat, lon}, date: số ngày thuê, user_item: budget và user_id

- Từ origin và destination, ta sẽ có được route thông qua hàm được thế kế sẵn

-> route: List[Coordinate]

- 1 hàm đảm nhận việc đánh giá địa hình dựa trên mỗi coordinate trong tập {route} dựa trên trọng số, của user (0->1, 0 là dễ đi nhất, 1 là khó đi nhất)

-> outer_score

- 1 model đảm nhận việc đánh giá tập phương tiện dựa trên tập training data phương tiện qua đánh giá địa hình mà nó đã được đi  (0->1)
  
-> Từ tập phương tiện đã được đánh giá, ta dùng phương pháp bình phương nhỏ nhất để tìm ra phương tiện phù hợp với địa hình dựa trên compability 

- Với tập phương tiện vừa rồi, ta tiếp tục cho model chấm điểm rating (1-5) dựa trên user_id(optional), veh_id, color, distance_km, weather_condition, budget:
  - Với user mới thì sẽ được dựa trên chủ yếu budget, weather_condition, distance_km của những user khác đã thuê để tìm ra xe phù hợp nhất
  - Với user cũ thì dựa vào hầu hết ngữ cảnh, bao gồm cả color, veh_id, khi đó dựa trên lịch sử người dùng thì có thể gợi ý những xe user này đã thuê với mức rating cao

## Data train model
- Dataset GMTED - địa hình của Việt Nam
-> Train knn model để nhận biết những coord không có feature

- Data lịch sử thuê xe (user_id, destination, length, veh_id, price, weather_id, color, rating)
-> Train model dự đoán rating xe dựa trên ngữ cảnh
  
- Data điểm vùng xe đã đi
-> Train model dự đoán điểm yếu tố môi trường thích hợp với xe
  
## Test
- Tại folder chính ~ recommendsystem, tạo folder .env và lên weather_api lấy api_key và để api_key = <API_KEY> hoặc tại file weather_score đặt constaint weather_score = ?
  
```python
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Chạy chương trình
cd app # Ổ hiện tại phải là trong folder app
uvicorn main:app --reload

```

- Mở port:
_http://127.0.0.1:8000/_ hoặc _http://127.0.0.1:8000/docs_

- Cấu trúc file json nhận của api:
<img width="1391" height="230" alt="image" src="https://github.com/user-attachments/assets/be1f75e4-06bc-4c98-bb1d-670f535e419d" />



```python
# Test json file
{
  "origin": {
    "lat": 10.7769,
    "lon": 106.7009
  },
  "destination": {
    "lat": 10.8231,
    "lon": 106.6297
  },
  "date": 5,
  "user": {
    "user_id": "USR_000001",
    "budget": 500000
  }
}

```

Kết quả trả về: 

```python
{
  "cars": [
    {
      "veh_id": "CAR_1243"
    },
    {
      "veh_id": "CAR_1008"
    },
    {
      "veh_id": "CAR_0228"
    }
  ],
  "bikes": [
    {
      "veh_id": "BIKE_33690"
    },
    {
      "veh_id": "BIKE_33690"
    },
    {
      "veh_id": "BIKE_33690"
    },
    {
      "veh_id": "BIKE_33690"
    },
    {
      "veh_id": "BIKE_33690"
    },
    {
      "veh_id": "BIKE_33690"
    },
    {
      "veh_id": "BIKE_33690"
    },
    {
      "veh_id": "BIKE_30650"
    },
    {
      "veh_id": "BIKE_30650"
    },
    {
      "veh_id": "BIKE_30650"
    }
  ]
}

```
## Cách chấm điểm tường phần
- Phần weather:

    weather_difficulty = {
        1000: 0.0, 1003: 0.1, 1006: 0.1, 1009: 0.15,
        1030: 0.3, 1150: 0.25, 1153: 0.3, 1180: 0.3, 1183: 0.35, 1240: 0.35,
        1063: 0.4, 1186: 0.5, 1189: 0.55, 1243: 0.55, 1087: 0.6, 1273: 0.55,
        1192: 0.65, 1195: 0.7, 1246: 0.75, 1135: 0.65, 1276: 0.75,
        1066: 0.7, 1210: 0.75, 1213: 0.8, 1216: 0.85, 1219: 0.9, 1222: 0.95, 1225: 1.0,
        1072: 0.9, 1168: 0.95, 1171: 1.0, 1198: 0.95, 1201: 1.0, 1147: 1.0,
        1237: 1.0, 1261: 0.95, 1264: 1.0,
        1069: 0.7, 1204: 0.75, 1207: 0.85, 1249: 0.75, 1252: 0.85,
        1279: 0.9
    }

Gọi api weather_api và dự báo trong {date} ngày sau đó tìm ngày có điểm số cao nhất - thời tiết xấu nhất và return điểm

- Phần phương tiện: 
  - Với xe ô tô, có rất nhiều feature nên ta có thể xét nhiều yếu tố trong bài toán regression, ví dụ: Torque, CC, HorsePower, Speed, HorsePower/Torque
  - Còn xe máy thì chỉ có yếu tố Power là quan trọng trong bài toán tính điểm phù hợp địa hình

- 

## Reliability
- Trong trường hợp ta chỉ xét một yếu tố, khách quan hoặc chủ quan, thì rất khó để có thể có khả
năng đúng cao. Thay vào đó ta kết hợp yếu tố khách quan - môi trường - lịch sử người dùng cũ,  yếu đó chủ quan - budget, color, lịch sữ cũ của người dùng
khi đó khả năng đúng sẽ cao hơn
