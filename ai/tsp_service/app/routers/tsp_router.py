from fastapi import APIRouter, HTTPException
import torch
from app.schemas.tsp_schemas import PredictRequest
from app.services.tsp_logic import state, normalize_coordinates, calculate_open_path_distance

router = APIRouter()

@router.post("/predict")
async def predict(request: PredictRequest):
    """Nhận dữ liệu, tiền xử lý, gọi AI và trả kết quả JSON"""
    if not state["MODEL_READY"]:
        raise HTTPException(status_code=503, detail="Model chưa sẵn sàng")

    # Hợp nhất dữ liệu
    all_points = [request.start_location] + request.destinations
    
    # Tiền xử lý (Chuẩn hóa tọa độ) và ép kiểu Tensor
    norm_coords = normalize_coordinates(all_points)
    coords = torch.tensor([norm_coords], dtype=torch.float32)

    try:
        # Suy luận bằng model trong state
        with torch.no_grad():
            state["model"].set_decode_type("greedy")
            _, _, pi = state["model"](coords, return_pi=True)
        
        tour_indices = pi[0].cpu().numpy().tolist()

        # Hậu xử lý (Xoay mảng & Tìm đường đi mở tốt nhất)
        start_position_in_tour = tour_indices.index(0)
        
        forward_indices = tour_indices[start_position_in_tour:] + tour_indices[:start_position_in_tour]
        reverse_indices = [forward_indices[0]] + forward_indices[1:][::-1]

        # Tính khoảng cách
        dist_forward = calculate_open_path_distance(forward_indices, all_points)
        dist_reverse = calculate_open_path_distance(reverse_indices, all_points)

        if dist_reverse < dist_forward:
            final_indices = reverse_indices
            final_distance = dist_reverse
        else:
            final_indices = forward_indices
            final_distance = dist_forward

        optimized_order = [all_points[i].model_dump() for i in final_indices]

        return {
            "status": "success",
            "start_point_id": request.start_location.id,
            "total_locations": len(all_points),
            "total_distance": round(final_distance, 4),
            "optimized_route": optimized_order
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi trong quá trình suy luận: {str(e)}")