import os
import sys
import math
import torch

# Cấu hình đường dẫn để import được thư mục utils bên ngoài app/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_DIR = os.path.dirname(BASE_DIR)
sys.path.append(ROOT_DIR)

from utils.functions import load_model

# Quản lý State của Model AI
state = {
    "model": None,
    "MODEL_READY": False
}

def load_resources():
    MODEL_PATH = os.path.join(ROOT_DIR, "pretrained", "epoch-99.pt")
    try:
        model, _ = load_model(MODEL_PATH)
        model.eval()
        state["model"] = model
        state["MODEL_READY"] = True
        print("Hệ thống TSP đã sẵn sàng! Đã nạp model PyTorch.")
    except Exception as e:
        print(f"Lỗi khởi tạo model TSP: {e}")
        state["MODEL_READY"] = False

def normalize_coordinates(points):
    """Chuẩn hóa GPS thực tế về khoảng 0.0 - 1.0 nhưng GIỮ NGUYÊN TỶ LỆ BẢN ĐỒ"""
    xs = [p.x for p in points]
    ys = [p.y for p in points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    
    range_x = max_x - min_x
    range_y = max_y - min_y
    max_range = max(range_x, range_y)
    
    if max_range == 0:
        max_range = 1.0
        
    normalized_list = []
    for p in points:
        norm_x = (p.x - min_x) / max_range
        norm_y = (p.y - min_y) / max_range
        normalized_list.append([norm_x, norm_y])
        
    return normalized_list

def calculate_open_path_distance(indices, points):
    dist = 0.0
    for i in range(len(indices) - 1):
        p1 = points[indices[i]]
        p2 = points[indices[i+1]]
        dist += math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2)
    return dist