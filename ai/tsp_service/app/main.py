from fastapi import FastAPI, HTTPException
from app.services.tsp_logic import load_resources, state
from app.routers import tsp_router

app = FastAPI(
    title="TSP Optimization API",
    description="Hệ thống AI tối ưu hóa lộ trình giao hàng thực tế (Hỗ trợ GPS).",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    # Gọi hàm nạp file .pt khi server vừa bật
    load_resources()

# Gắn nhánh API predict vào app
app.include_router(tsp_router.router)

@app.get("/")
async def root():
    return {
        "system_name": "AI Routing Optimization Service",
        "description": "API nhận tọa độ GPS bất kỳ, sử dụng AI để tìm lộ trình giao hàng ngắn nhất không quay về điểm xuất phát.",
        "author": "Nguyen Ha Minh Hien"
    }

@app.get("/health")
async def health_check():
    if state["MODEL_READY"]:
        return {"status": "ok", "model_state": "loaded and ready"}
    else:
        raise HTTPException(status_code=503, detail="Service Unavailable: Model chưa sẵn sàng.")