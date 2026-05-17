import os
import pickle
import gzip
from pathlib import Path
import pandas as pd
import geopandas
from shapely import wkt
import osmnx as ox

# Define paths
BASE_DIR = Path(__file__).resolve().parent
NODES_DIR = BASE_DIR / "NodesnEdges" / "Nodes"
EDGES_DIR = BASE_DIR / "NodesnEdges" / "Edges"
OUTPUT_DIR = BASE_DIR / "serialized_graphs"

# Create output directory
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def serialize_graphs():
    if not NODES_DIR.exists() or not EDGES_DIR.exists():
        print(f"Error: Nodes or Edges directory not found at: {NODES_DIR.parent}")
        return

    nodes_files = [f for f in os.listdir(NODES_DIR) if f.endswith(".csv")]
    
    print(f"Found {len(nodes_files)} region(s) to serialize.")
    
    for filename in nodes_files:
        region_name = filename.replace(".csv", "")
        output_file = OUTPUT_DIR / f"{region_name}_graph.pkl.gz"
        
        print(f"\n--- Processing region: {region_name} ---")
        
        node_path = NODES_DIR / filename
        edge_path = EDGES_DIR / filename
        
        if not edge_path.exists():
            print(f"Warning: Edges file missing for region '{region_name}' at {edge_path}. Skipping.")
            continue
            
        try:
            print(f"1. Loading CSV files...")
            nodes = pd.read_csv(node_path, low_memory=False)
            edges = pd.read_csv(edge_path, low_memory=False)
            
            print(f"2. Parsing WKT geometries...")
            nodes['geometry'] = nodes['geometry'].apply(wkt.loads)
            edges['geometry'] = edges['geometry'].apply(wkt.loads)
            
            print(f"3. Building GeoDataFrames...")
            nodes = geopandas.GeoDataFrame(nodes, geometry='geometry', crs="EPSG:4326")
            edges = geopandas.GeoDataFrame(edges, geometry='geometry', crs="EPSG:4326")
            
            nodes = nodes.set_index("osmid")
            edges = edges.set_index(["u", "v", "key"])
            
            print(f"4. Generating MultiDiGraph using OSMnx...")
            G = ox.graph_from_gdfs(nodes, edges)
            
            print(f"5. Serializing and compressing to {output_file.name}...")
            with gzip.open(output_file, 'wb') as f:
                pickle.dump(G, f, protocol=pickle.HIGHEST_PROTOCOL)
                
            original_size_mb = (os.path.getsize(node_path) + os.path.getsize(edge_path)) / (1024 * 1024)
            compressed_size_mb = os.path.getsize(output_file) / (1024 * 1024)
            
            print(f"Successfully serialized '{region_name}'!")
            print(f"   Original CSV Size:   {original_size_mb:.2f} MB")
            print(f"   Compressed Graph Size: {compressed_size_mb:.2f} MB")
            print(f"   Size Reduction:        {((original_size_mb - compressed_size_mb) / original_size_mb) * 100:.1f}%")
            
        except Exception as e:
            print(f"Error processing region '{region_name}': {e}")

if __name__ == "__main__":
    serialize_graphs()
