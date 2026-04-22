import os
import sys
import math
import torch

# Configure paths to allow importing the 'utils' directory located outside 'app/'
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_DIR = os.path.dirname(BASE_DIR)
sys.path.append(ROOT_DIR)

from utils.functions import load_model

# AI Model State Management
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
        print("TSP System is ready! PyTorch model loaded successfully.")
    except Exception as e:
        print(f"Error initializing TSP model: {e}")
        state["MODEL_READY"] = False

def normalize_coordinates(points):
    """Normalize real-world GPS coordinates to a range of 0.0 - 1.0 while preserving the map's aspect ratio"""
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