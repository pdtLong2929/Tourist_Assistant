import os
import pickle
import glob
import cornac
from groq import Groq

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(os.path.dirname(BASE_DIR), "data")

# State variables
state = {
    "uid_map": {},
    "iid_map": {},
    "idx_to_iid": {},
    "model_efm": None,
    "mock_db": {},
    "client": None
}

def load_resources():
    try:
        # Nạp Mapping
        with open(os.path.join(DATA_DIR, 'efm_mapping.pkl'), 'rb') as f:
            mapping = pickle.load(f)
        state["uid_map"] = mapping['uid_map']
        state["iid_map"] = mapping['iid_map']
        state["idx_to_iid"] = {v: k for k, v in mapping['iid_map'].items()}
        
        # Nạp Model
        pkl_files = glob.glob(f"{os.path.join(DATA_DIR, 'efm_model_final')}/**/*.pkl", recursive=True)
        state["model_efm"] = cornac.models.EFM.load(sorted(pkl_files)[-1])
        
        # Nạp DB
        with open(os.path.join(DATA_DIR, 'mock_database_triplets.pkl'), 'rb') as f:
            state["mock_db"] = pickle.load(f)
            
        # Khởi tạo Groq
        state["client"] = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        print("Hệ thống EFM Services đã sẵn sàng!")
    except Exception as e:
        print(f"LỖI KHỞI TẠO: {str(e)}")

def generate_ai_explanation(item_id: str, score: float) -> str:
    pros, cons = [], []
    prefix = f"{item_id}_"
    
    # 1. Lấy dữ liệu từ cuốn sổ cái state["mock_db"]
    for key, data in state["mock_db"].items():
        if key.startswith(prefix):
            aspect = key.replace(prefix, "")
            if data['positive_opinions']:
                pros.extend([f"'{aspect}' ({op})" for op in data['positive_opinions']])
            if data['negative_opinions']:
                cons.extend([f"'{aspect}' ({op})" for op in data['negative_opinions']])
                
    # 2. Xử lý text
    pros_text = ", ".join(pros[:3]) if pros else "điểm sáng chung"
    cons_text = ", ".join(cons[:3]) if cons else "không có phàn nàn rõ ràng"
    
    prompt = (
        f"Người dùng được dự đoán đánh giá địa điểm này {score:.1f}/5 sao. "
        f"Dữ liệu khách cũ: Ưu điểm: {pros_text}. Nhược điểm: {cons_text}. "
        f"Hãy viết 2 câu tiếng Việt tư vấn khách quan, nêu cả ưu và nhược điểm. Không mào đầu rườm rà."
    )
    
    # 3. Gọi API Groq từ cuốn sổ cái state["client"]
    try:
        chat = state["client"].chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.4
        )
        return chat.choices[0].message.content.strip()
    except Exception as e:
        print(f"Lỗi gọi Groq: {e}") # Nên print lỗi ra terminal để dễ gỡ lỗi (debug)
        return "Hiện chưa có nhận xét chi tiết cho địa điểm này."