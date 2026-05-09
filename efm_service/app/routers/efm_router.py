from fastapi import APIRouter, HTTPException
from app.schemas.efm_schemas import PredictionRequest, RecommendRequest
from app.services.efm_logic import calculate_cold_start_score, state, generate_ai_explanation, get_user_interests, get_destination_features
router = APIRouter()

@router.post("/api/predict")
def predict(req: PredictionRequest):
    """
    Predict ratings for a specific list of locations and provide personalized explanations.
    """
    results = []
    # Get internal user index from ID mapping
    user_interests = get_user_interests(req.user_id)
    u_idx = state["uid_map"].get(req.user_id, None)
    
    
    for i_id in req.item_ids:
        item_data = get_destination_features(i_id)
        i_idx = state["iid_map"].get(i_id, None)
        
        # 2. Calculate predicted score
        if u_idx is not None and i_idx is not None:
            raw_score = state["model_efm"].score(u_idx, i_idx)
        else:
            # Fallback score if user or item is not in training data (Cold Start)
            raw_score = calculate_cold_start_score(req.user_id, i_id) 

        score = float(max(1.0, min(5.0, raw_score)))
            
        # 3. Generate personalized explanation using LLaMA
        explanation = generate_ai_explanation(item_data, score, user_interests)
        
        results.append({
            "item_id": i_id,
            "predicted_rating": round(score, 1),
            "explanation": explanation
        })
    results.sort(key=lambda x: x["predicted_rating"], reverse=True)
    return {"data": results}

@router.post("/api/recommend")
def recommend(req: RecommendRequest):
    """
    Suggest Top-K locations based on EFM (Existing Users) or Cold Start (New Users).
    """
    u_idx = state["uid_map"].get(req.user_id, None)
    model = state["model_efm"]
    results = []

    # --- CASE 1: NEW USER (COLD START) ---
    if u_idx is None:
        # Get a sample of items to calculate (e.g., top 50 most popular items)
        all_item_ids = list(state["iid_map"].keys())[:400]

        for i_id in all_item_ids:
            # Calculate score based on the average of similar "neighbors"
            score = calculate_cold_start_score(req.user_id, i_id)
            
            results.append({
                "item_id": i_id,
                "predicted_rating": round(score, 1)
            })
            
    # --- CASE 2: EXISTING USER (IN EFM MODEL) ---
    else:
        try:
            # Get ranked items for this user index from EFM
            rankings, _ = model.rank(u_idx)
            item_indices = rankings[:req.top_k]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error during recommendation process: {str(e)}")

        for idx in item_indices:
            # Map internal Index back to actual ID
            i_id = state["idx_to_iid"].get(idx)
            if not i_id:
                continue
            
            # Calculate score from the EFM model
            raw_score = float(model.score(u_idx, idx))
            score = max(1.0, min(5.0, raw_score))
            
            results.append({
                "item_id": i_id,
                "predicted_rating": round(score, 1),
            })

    # Sort the results from highest to lowest predicted rating
    results.sort(key=lambda x: x["predicted_rating"], reverse=True)  
    
    # Slice exactly the requested Top-K and return
    return {"data": results[:req.top_k]}