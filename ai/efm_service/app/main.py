from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import os
import pickle
import glob
import cornac
from groq import Groq

# Khởi tạo FastAPI App
app = FastAPI(title="Tourist Assistant AI - EFM Service", version="1.1")

# ==========================================================
# 1. CẤU HÌNH ĐƯỜNG DẪN (RELATIVE PATHS)
# ==========================================================
# Lấy đường dẫn thư mục chứa file app.py hiện tại
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Đi đến thư mục data (giả định cấu trúc: ai/efm_service/app.py và ai/efm_service/data/)
DATA_DIR = os.path.join(os.path.dirname(BASE_DIR), "data")

# Các biến toàn cục để lưu trữ Model và Mapping
uid_map = {}
iid_map = {}
idx_to_iid = {}
model_efm = None
mock_db = {}

@app.on_event("startup")
async def load_resources():
    global uid_map, iid_map, idx_to_iid, model_efm, mock_db
    
    try:
        # 1. Nạp Từ điển Mapping
        mapping_path = os.path.join(DATA_DIR, 'efm_mapping.pkl')
        with open(mapping_path, 'rb') as f:
            mapping = pickle.load(f)
        uid_map = mapping['uid_map']
        iid_map = mapping['iid_map']
        idx_to_iid = {v: k for k, v in iid_map.items()}
        
        # 2. Nạp Mô hình EFM (Cornac sẽ tự tìm file .meta và .pkl)
        model_base_dir = os.path.join(DATA_DIR, 'efm_model_final')
        # Tìm file .pkl mới nhất trong thư mục
        pkl_files = glob.glob(f"{model_base_dir}/**/*.pkl", recursive=True)
        if not pkl_files:
            raise FileNotFoundError("Không tìm thấy file model .pkl trong thư mục data!")
        
        latest_model_file = sorted(pkl_files)[-1]
        model_efm = cornac.models.EFM.load(latest_model_file)
        
        # 3. Nạp Mock Database (Triplets)
        db_path = os.path.join(DATA_DIR, 'mock_database_triplets.pkl')
        with open(db_path, 'rb') as f:
            mock_db = pickle.load(f)
            
        print(f"Hệ thống đã sẵn sàng! Đã nạp model từ: {latest_model_file}")
    except Exception as e:
        print(f"LỖI KHỞI TẠO HỆ THỐNG: {str(e)}")

# Khởi tạo Groq Client (Sử dụng biến môi trường để bảo mật)
# Bạn cần chạy lệnh: export GROQ_API_KEY='key_cua_ban' trước khi khởi động server
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# ==========================================================
# 2. ĐỊNH NGHĨA SCHEMA DỮ LIỆU
# ==========================================================
class PredictionRequest(BaseModel):
    user_id: str
    item_ids: List[str]

class RecommendRequest(BaseModel):
    user_id: str
    top_k: int = 5

# ==========================================================
# 3. HÀM SINH LỜI GIẢI THÍCH (LLM)
# ==========================================================
def generate_ai_explanation(item_id: str, score: float):
    pros, cons = [], []
    prefix = f"{item_id}_"
    
    # Lấy dữ liệu từ Mock DB
    for key, data in mock_db.items():
        if key.startswith(prefix):
            aspect = key.replace(prefix, "")
            if data['positive_opinions']:
                pros.extend([f"'{aspect}' ({op})" for op in data['positive_opinions']])
            if data['negative_opinions']:
                cons.extend([f"'{aspect}' ({op})" for op in data['negative_opinions']])
    
    pros_text = ", ".join(pros[:3]) if pros else "điểm sáng chung"
    cons_text = ", ".join(cons[:3]) if cons else "không có phàn nàn rõ ràng"

    prompt = (
        f"Người dùng được dự đoán đánh giá địa điểm này {score:.1f}/5 sao. "
        f"Dữ liệu khách cũ: Ưu điểm: {pros_text}. Nhược điểm: {cons_text}. "
        f"Hãy viết 2 câu tiếng Việt tư vấn khách quan, nêu cả ưu và nhược điểm. Không mào đầu rườm rà."
    )
    
    try:
        chat = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.4
        )
        return chat.choices[0].message.content.strip()
    except:
        return "Hiện chưa có nhận xét chi tiết cho địa điểm này."

# ==========================================================
# 4. CÁC ENDPOINT API
# ==========================================================

@app.get("/")
def health_check():
    return {"status": "online", "service": "EFM Recommender"}

@app.post("/api/predict")
def predict(req: PredictionRequest):
    results = []
    u_idx = uid_map.get(req.user_id, None)
    
    for i_id in req.item_ids:
        i_idx = iid_map.get(i_id, None)
        if u_idx is not None and i_idx is not None:
            # Tính điểm từ EFM
            raw_score = model_efm.score(u_idx, i_idx)
            score = float(max(1.0, min(5.0, raw_score)))
        else:
            score = 3.9  # Điểm mặc định cho người dùng/địa điểm mới (Global Mean)
            
        explanation = generate_ai_explanation(i_id, score)
        results.append({
            "item_id": i_id,
            "predicted_rating": round(score, 1),
            "explanation": explanation
        })
    return {"data": results}

@app.post("/api/recommend")
def recommend(req: RecommendRequest):
    u_idx = uid_map.get(req.user_id, None)
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