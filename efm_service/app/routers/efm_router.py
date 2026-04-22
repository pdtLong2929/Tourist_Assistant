from fastapi import APIRouter, HTTPException
from app.schemas.efm_schemas import PredictionRequest, RecommendRequest
from app.services.efm_logic import state, generate_ai_explanation, get_user_interests

router = APIRouter()

@router.post("/api/predict")
def predict(req: PredictionRequest):
    """
    Predict ratings for a specific list of locations and provide personalized explanations.
    """
    results = []
    # Get internal user index from ID mapping
    u_idx = state["uid_map"].get(req.user_id, None)
    
    # 1. Retrieve User Interests (based on EFM U1 matrix or fallback)
    user_interests = get_user_interests(req.user_id)
    
    for i_id in req.item_ids:
        i_idx = state["iid_map"].get(i_id, None)
        
        # 2. Calculate predicted score
        if u_idx is not None and i_idx is not None:
            raw_score = state["model_efm"].score(u_idx, i_idx)
            # Normalize score to [1.0, 5.0] range
            score = float(max(1.0, min(5.0, raw_score)))
        else:
            # Fallback score if user or item is not in training data (Cold Start)
            score = 3.5 
            
        # 3. Generate personalized explanation using LLaMA
        explanation = generate_ai_explanation(i_id, score, user_interests)
        
        results.append({
            "item_id": i_id,
            "predicted_rating": round(score, 1),
            "explanation": explanation
        })
        
    return {"data": results}

@router.post("/api/recommend")
def recommend(req: RecommendRequest):
    """
    Suggest Top-K locations and provide personalized reasons for the recommendations.
    """
    u_idx = state["uid_map"].get(req.user_id, None)
    if u_idx is None:
        raise HTTPException(status_code=404, detail=f"User ID '{req.user_id}' not found in the system data.")
    
    model = state["model_efm"]
    
    # 1. Retrieve User Interests
    user_interests = get_user_interests(req.user_id)
    
    # 2. Retrieve Top-K Item Indices from EFM Model
    try:
        # Get ranked items for this user index
        rankings, _ = model.rank(u_idx)
        item_indices = rankings[:req.top_k]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during recommendation process: {str(e)}")

    results = []
    for idx in item_indices:
        # Map internal Index back to actual ID
        i_id = state["idx_to_iid"].get(idx)
        if not i_id:
            continue
        
        # 3. Calculate score and generate personalized explanation
        raw_score = float(model.score(u_idx, idx))
        score = max(1.0, min(5.0, raw_score))
        explanation = generate_ai_explanation(i_id, score, user_interests)
        
        results.append({
            "item_id": i_id,
            "predicted_rating": round(score, 1),
            "explanation": explanation
        })
        
    return {"data": results}