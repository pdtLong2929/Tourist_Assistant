import os
import pickle
import glob
import cornac
import numpy as np
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(os.path.dirname(BASE_DIR), "data")

# State variables
state = {
    "uid_map": {},
    "iid_map": {},
    "idx_to_iid": {},
    "aspect_id_map": {},
    "aspect_id_map_inv": {},
    "model_efm": None,
    "mock_db": {},
    "client": None
}

def load_resources():
    try:
        # 1. Load Mapping
        with open(os.path.join(DATA_DIR, 'efm_mapping.pkl'), 'rb') as f:
            mapping = pickle.load(f)
        
        state["uid_map"] = mapping['uid_map']
        state["iid_map"] = mapping['iid_map']
        state["idx_to_iid"] = {v: k for k, v in mapping['iid_map'].items()}
        
        # Mapping aspects
        state["aspect_id_map"] = mapping['aspect_id_map']
        state["aspect_id_map_inv"] = {v: k for k, v in mapping['aspect_id_map'].items()}
        
        # 2. Load Model
        pkl_files = glob.glob(os.path.join(DATA_DIR, '20*.pkl'))
        pkl_files.extend(glob.glob(os.path.join(DATA_DIR, 'efm_model_final', '*.pkl')))
        
        if not pkl_files:
            raise FileNotFoundError(f"No AI model files (.pkl) found in {DATA_DIR}!")
            
        latest_model_file = sorted(pkl_files)[-1]
        state["model_efm"] = cornac.models.EFM.load(latest_model_file)
        
        # 3. Load Location Feature Database (Triplets)
        with open(os.path.join(DATA_DIR, 'mock_database_triplets.pkl'), 'rb') as f:
            state["mock_db"] = pickle.load(f)
            
        # 4. Initialize Groq Client
        state["client"] = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        print("EFM Services system is ready with Personalized Explanation features!")
        
    except Exception as e:
        print(f"INITIALIZATION ERROR: {str(e)}")

def get_user_context(user_id: str):
    """
    Extract user interests for both new and existing users.
    """
    u_idx = state["uid_map"].get(user_id)
    
    
    if u_idx is None:
        db_tags_json = {
            "tokyo": 0.5358,
            "street": 0.4606,
            "shop": 0.3612,
            "layout": 0.3579,
            "area": 0.3257
        }
        
        sorted_tags = sorted(db_tags_json.items(), key=lambda x: x[1], reverse=True)
        return sorted_tags[:5] 
        
    else:
        efm_tags = get_user_interests(user_id) 
        return [(tag, 1.0) for tag in efm_tags]

def get_user_interests(user_id: str, top_k: int = 3):
    """
    Extract the top aspects a user cares about from EFM's U1 matrix.
    """
    u_idx = state["uid_map"].get(user_id)
    model = state["model_efm"]
    
    if u_idx is None or model is None:
        return []

    try:
        user_pref_vector = model.U1[u_idx]
        
        # Number of actual aspects from mapping
        num_aspects = len(state["aspect_id_map"])
        
        # Slice vector to only include aspects
        relevant_vector = user_pref_vector[:num_aspects]
        
        # Find indices of the top-k largest values
        top_indices = np.argsort(relevant_vector)[-top_k:][::-1]
        
        # Convert indices to aspect names (e.g., 0 -> "food")
        inv_map = state["aspect_id_map_inv"]
        return [inv_map[idx] for idx in top_indices if idx in inv_map]
    except Exception as e:
        print(f"Error extracting user interests: {e}")
        return []
    
def get_destination_features(item_id: str):
    return state["mock_db"].get(item_id, {})

def calculate_cold_start_score(user_id: str, item_id: str, top_n: int = 5):
    """
    Calculate a score for a new user based on similarity to existing users.
    """
    current_interests = get_user_context(user_id) 
    
    current_dict = {tag: weight for tag, weight in current_interests}
    if not current_dict:
        return 3.5  

    i_idx = state["iid_map"].get(item_id)
    if i_idx is None:
        return 3.5

    similarities = []
    
    for other_id, other_u_idx in state["uid_map"].items():
        if other_id == user_id:
            continue
            
        other_interests = get_user_context(other_id)
        other_dict = {tag: weight for tag, weight in other_interests}

        common_tags = current_dict.keys() & other_dict.keys()
        
        if common_tags:
            sim_score = 0

            for tag in common_tags:
                sim_score += current_dict[tag] * other_dict[tag]
                
            similarities.append((other_u_idx, sim_score))

    if not similarities:
        return 3.8 

    similarities.sort(key=lambda x: x[1], reverse=True)
    top_neighbors = similarities[:top_n]

    neighbor_scores = []
    for u_idx_neighbor, sim_weight in top_neighbors:
        raw_s = state["model_efm"].score(u_idx_neighbor, i_idx)
        neighbor_scores.append(raw_s)

    return float(np.mean(neighbor_scores))

def generate_ai_explanation(item_data: dict, score: float, user_interests: list) -> str:
    """
    Generate an AI-powered explanation.
    """
    interest_keys = [item[0] for item in user_interests]
    
    aspects = item_data.get('aspects', {})

    matched_pros = []
    other_pros = []
    cons = []

    for aspect, data in aspects.items():
        pos_list = data.get('positive_opinions', [])
        neg_list = data.get('negative_opinions', [])
        
        pos_op = pos_list[0] if pos_list else "good"
        neg_op = neg_list[0] if neg_list else "not satisfied"
        sentiment = data.get('sentiment_score', 0)
        
        if aspect in interest_keys and sentiment > 0:
            matched_pros.append(f"{aspect} ({pos_op})")
        elif sentiment > 0:
            other_pros.append(f"{aspect} ({pos_op})")
        
        if sentiment < 0:
            cons.append(f"{aspect} ({neg_op})")

    interests_str = ", ".join(interest_keys)
    matched_str = ", ".join(matched_pros) if matched_pros else "general highlights"
    
    prompt = f"""
    You are a professional travel assistant. This customer specifically cares about: {interests_str}.
    AI predicted they would rate this place {score:.1f}/5 stars.
    Real data at location:
    - User's preference match: {matched_str}
    - Other strengths: {", ".join(other_pros[:2])}
    - Note: {", ".join(cons[:1])}

    TASK: Write a single, cohesive review paragraph consisting of exactly 2 sentences. If there's a 'Preference match', emphasize that this place is perfect for their specific taste.

    STRICT RULES:
    - Output ONLY the review text. 
    - DO NOT use introductory phrases like "Here is...", "Based on...", or "Here are two possible...".
    - DO NOT use numbering (1., 2.), bullet points, or options.
    """

    try:
        chat = state["client"].chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.4
        )
        return chat.choices[0].message.content.strip()
    except Exception as e:
        print(f"Llama Error: {str(e)}")
        return f"This location matches your interest in {interests_str}."

