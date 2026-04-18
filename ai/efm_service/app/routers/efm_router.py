from fastapi import APIRouter, HTTPException
from app.schemas.efm_schemas import PredictionRequest, RecommendRequest
from app.services.efm_logic import state, generate_ai_explanation

router = APIRouter()

@router.post("/api/predict")
def predict(req: PredictionRequest):
    results = []
    u_idx = state["uid_map"].get(req.user_id, None)
    
    for i_id in req.item_ids:
        i_idx = state["iid_map"].get(i_id, None)
        if u_idx is not None and i_idx is not None:
            raw_score = state["model_efm"].score(u_idx, i_idx)
            score = float(max(1.0, min(5.0, raw_score)))
        else:
            score = 3.9
            
        explanation = generate_ai_explanation(i_id, score)
        results.append({
            "item_id": i_id,
            "predicted_rating": round(score, 1),
            "explanation": explanation
        })
    return {"data": results}

@router.post("/api/recommend")
def recommend(req: RecommendRequest):
    u_idx = state["uid_map"].get(req.user_id, None)
    if u_idx is None:
     raise HTTPException(status_code=404, detail="User không tồn tại trong hệ thống train.")
    # Lấy danh sách Top K Item Index
    try:
        item_indices = model_efm.recommend(u_idx)[:req.top_k]
    except:
        # Fallback nếu hàm recommend của version Cornac khác
        rankings, _ = model_efm.rank(u_idx)
        item_indices = rankings[:req.top_k]
    
    results = []
    for idx in item_indices:
        i_id = idx_to_iid[idx]
        score = float(model_efm.score(u_idx, idx))
        explanation = generate_ai_explanation(i_id, score)
        results.append({
            "item_id": i_id,
            "predicted_rating": round(score, 1),
            "explanation": explanation
        })
    return {"data": results}




















   
    