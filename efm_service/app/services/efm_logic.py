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

def get_user_interests(user_id: str, top_k: int = 3):
    """
    Extract the top aspects a user cares about from EFM's U1 matrix.
    """
    u_idx = state["uid_map"].get(user_id)
    model = state["model_efm"]
    
    if u_idx is None or model is None:
        return []

    try:
        # Get preference vector from U1 matrix (Explicit User Factors)
                # Dimensions: (num_users, num_aspects)
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

def generate_ai_explanation(item_id: str, score: float, user_interests: list) -> str:
    """
    Generate an AI-powered explanation in English based on the intersection of user preferences and item features.
    """
    item_data = state["mock_db"].get(item_id, {})
    aspects = item_data.get('aspects', {})

    matched_pros = []
    other_pros = []
    cons = []

    for aspect, data in aspects.items():
        pos_op = data['positive_opinions'][0] if data['positive_opinions'] else "good"
        neg_op = data['negative_opinions'][0] if data['negative_opinions'] else "not satisfied"
        
        if aspect in user_interests and data['sentiment_score'] > 0:
            matched_pros.append(f"{aspect} ({pos_op})")
        elif data['sentiment_score'] > 0:
            other_pros.append(f"{aspect} ({pos_op})")
        
        if data['sentiment_score'] < 0:
            cons.append(f"{aspect} ({neg_op})")

    interests_str = ", ".join(user_interests)
    matched_str = ", ".join(matched_pros) if matched_pros else "general highlights"
    
    prompt = f"""
    You are a professional travel assistant. This customer specifically cares about: {interests_str}.
    AI predicted they would rate this place {score:.1f}/5 stars.
    Real data at location:
    - User's preference match: {matched_str}
    - Other strengths: {", ".join(other_pros[:2])}
    - Note: {", ".join(cons[:1])}
    
    TASK: Write 2 natural English sentences for a review. If there's a 'Preference match', emphasize that this place is perfect for their specific taste.
    """

    try:
        chat = state["client"].chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.4
        )
        return chat.choices[0].message.content.strip()
    except:
        return f"This location matches your interest in {interests_str}."