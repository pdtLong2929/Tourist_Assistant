# Hướng Dẫn Cache Khi Thêm Model/API Mới
---

# 1. Tư duy đúng trước khi code

```text
1 hệ thống cache dùng chung
+
withCache() wrapper
+
namespace key riêng
+
TTL riêng cho từng loại dữ liệu
```

Ví dụ:

```text
vehicle:hcm:rain
weather:dalat
llm:ollama:abc123
map:hcm:vungtau
```

---

# 2. Cấu trúc thư mục chuẩn

```text
src/
├── cache/
│   ├── memoryCache.js
│   ├── redisCache.js
│   ├── cacheManager.js
│   └── cacheWrapper.js
│
├── utils/
│   └── keyBuilder.js
│
├── services/
│   ├── vehicleService.js
│   ├── weatherService.js
│   ├── llmService.js
│   └── newModelService.js
│
├── controllers/
│   └── newModelController.js
│
├── routes/
│   └── newModelRoutes.js
```

---

# 3. Khi thêm model mới cần sửa những file nào?

Chỉ cần 3 nơi chính:

```text
1. keyBuilder.js
2. service mới
3. controller + route mới
```

KHÔNG cần tạo file cache mới.

---

# 4. Bước 1 — Tạo cache key trong keyBuilder.js

## File:

```text
src/utils/keyBuilder.js
```

---

## Ví dụ model mới: Traffic API

Ta muốn cache dữ liệu giao thông.

### Viết thêm:

```javascript
export function trafficKey({ from, to }) {
  return `traffic:${from}:${to}`;
}
```

---

## Ví dụ model AI mới

```javascript
import crypto from "crypto";

function hash(text) {
  return crypto
    .createHash("md5")
    .update(String(text))
    .digest("hex");
}

export function customAIKey({ prompt, model }) {
  return `custom-ai:${model}:${hash(prompt)}`;
}
```

---

## Vì sao phải hash?

Sai:

```javascript
llm:${prompt}
```

Vì prompt quá dài → key rất xấu.

Đúng:

```javascript
llm:${md5(prompt)}
```

---

# 5. Bước 2 — Tạo service mới

## File:

```text
src/services/newModelService.js
```

---

## Ví dụ hoàn chỉnh

```javascript
import { withCache } from "../cache/cacheWrapper.js";
import { trafficKey } from "../utils/keyBuilder.js";

export async function getTrafficInfo({ from, to }) {
  return await withCache({
    key: trafficKey({ from, to }),

    ttl: 900,

    fetcher: async () => {
      // Gọi API thật ở đây
      return {
        from,
        to,
        status: "kẹt xe",
        updatedAt: new Date(),
      };
    },
  });
}
```

---

# 6. Giải thích service

## key

```javascript
key: traffic:hcm:vungtau
```

phân biệt dữ liệu cache.

---

## ttl

```javascript
ttl: 900
```

nghĩa là:

```text
15 phút
```

sau 15 phút cache tự hết hạn.

---

## fetcher

```javascript
fetcher: async () => {}
```

đây là nơi gọi API thật.

Cache miss → chạy fetcher.

Cache hit → không chạy fetcher.

---

# 7. Bước 3 — Tạo controller

## File:

```text
src/controllers/newModelController.js
```

---

## Code mẫu

```javascript
import { getTrafficInfo } from "../services/newModelService.js";

export async function trafficController(req, res) {
  try {
    const {
      from = "hcm",
      to = "vungtau",
    } = req.query;

    const result = await getTrafficInfo({ from, to });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}
```

---

# 8. Bước 4 — Tạo route

## File:

```text
src/routes/newModelRoutes.js
```

---

## Code mẫu

```javascript
import express from "express";
import { trafficController } from "../controllers/newModelController.js";

const router = express.Router();

router.get("/traffic", trafficController);

export default router;
```

---

# 9. Bước 5 — Gắn route vào app.js

## File:

```text
src/app.js
```

---

## Thêm import

```javascript
import trafficRoutes from "./routes/newModelRoutes.js";
```

---

## Thêm use

```javascript
app.use("/api", trafficRoutes);
```

---

# 10. TTL nên chọn bao nhiêu?

| Loại dữ liệu | TTL gợi ý |
|---|---:|
| vehicle | 5–15 phút |
| weather | 10–30 phút |
| traffic | 10–20 phút |
| AI model | 1–24 giờ |
| static config | 1 ngày |
| map distance | 30 phút |

---

# 11. Những lỗi sinh viên hay gặp

## Lỗi 1 — key không có namespace

Sai:

```javascript
key: "abc123"
```

Đúng:

```javascript
key: "weather:hcm"
```

---

## Lỗi 2 — tạo file cache riêng

Sai:

```text
trafficCache.js
```

Đúng:

```text
service dùng chung withCache()
```

---

## Lỗi 3 — TTL quá dài

Ví dụ weather cache 7 ngày.

→ dữ liệu sai.

---

## Lỗi 4 — không test cache hit/miss

Phải test:

```text
lần 1 → MISS
lần 2 → HIT
```

---

# 12. Cách test nhanh nhất

## Gọi API lần 1

```text
CACHE MISS
```

---

## Gọi API lần 2

```text
CACHE HIT
```

---

## redis-cli kiểm tra

```bash
redis-cli
KEYS *
```

phải thấy key mới xuất hiện.

---

# 13. Câu trả lời khi giảng viên hỏi

## Tại sao em không tạo nhiều file cache?

Trả lời:

```text
Em dùng generic cache wrapper để mọi API đều có thể tái sử dụng.
Cache chỉ là cơ chế chung nên em dùng một hệ thống cache duy nhất.
Các loại dữ liệu được phân biệt bằng namespace key và TTL riêng.
```

---

## Khi thêm model mới em làm gì?

Trả lời:

```text
Em chỉ cần thêm keyBuilder, service, controller và route.
Không cần viết lại hệ thống cache.
Điều này giúp project dễ scale và dễ maintain.
```

---

# 14. Checklist cuối cùng

## Trước khi commit

- [ ] đã tạo keyBuilder
- [ ] key có namespace
- [ ] TTL hợp lý
- [ ] service dùng withCache()
- [ ] route hoạt động
- [ ] test MISS/HIT thành công
- [ ] Redis lưu key thật
- [ ] fallback hoạt động nếu Redis lỗi

---

# Kết luận

## Công thức chuẩn

```text
Model mới
→ keyBuilder
→ Service + withCache()
→ Controller
→ Route
→ Test MISS/HIT
```

