import os
import pickle
import gzip
from pathlib import Path
import osmnx as ox
import networkx as nx
import pandas as pd
import geopandas
from shapely import wkt

# Optional Google Cloud Storage dependency for serverless Firebase integration
try:
    from google.cloud import storage
    GCS_AVAILABLE = True
except ImportError:
    GCS_AVAILABLE = False

BASE_DIR = Path(__file__).resolve().parent

coord_df = pd.read_csv(BASE_DIR/"../../data/NodesnEdges/coordinate_summary.csv")
def find_region(lat, lon, coord_df):

    for _, row in coord_df.iterrows():
        if (
            row["min_lat"] <= lat <= row["max_lat"]
            and
            row["min_lon"] <= lon <= row["max_lon"]
        ):
            return row["file"]

    return None


_GRAPH_CACHE = {}


def _unpickle_graph(file_path: Path):
    print(f"De-serializing and loading graph from {file_path.name}...")
    with gzip.open(file_path, "rb") as f:
        return pickle.load(f)


def load_serialized_graph(region_name: str) -> os.environ:
    filename = f"{region_name}_graph.pkl.gz"
    
    # 1. Check local ephemeral cache (/tmp/graph_cache)
    tmp_path = Path("/tmp/graph_cache") / filename
    if tmp_path.exists():
        print(f"Graph cache hit in local ephemeral memory: '{tmp_path}'")
        return _unpickle_graph(tmp_path)
        
    # 2. Check local workspace serialized graphs directory
    local_path = (BASE_DIR / ".." / ".." / "data" / "serialized_graphs" / filename).resolve()
    if local_path.exists():
        print(f"Serialized graph file found in local workspace: '{local_path}'")
        return _unpickle_graph(local_path)
        
    # 3. Check Firebase Storage (Google Cloud Storage) if configured
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
    if bucket_name and GCS_AVAILABLE:
        try:
            print(f"Attempting to download '{filename}' from Firebase Storage bucket '{bucket_name}'...")
            Path("/tmp/graph_cache").mkdir(parents=True, exist_ok=True)
            
            client = storage.Client()
            bucket = client.bucket(bucket_name)
            blob = bucket.blob(f"graphs/{filename}")
            
            blob.download_to_filename(str(tmp_path))
            print(f"Successfully downloaded '{filename}' to local ephemeral storage at '{tmp_path}'.")
            return _unpickle_graph(tmp_path)
        except Exception as e:
            print(f"Warning: Failed downloading from Firebase Storage: {e}")
            
    return None


def getroute(lat1, lon1, lat2, lon2):
    global _GRAPH_CACHE

    region = find_region((lat1+lat2)/2, (lon1+lon2)/2, coord_df)
    if not region:
        raise ValueError(f"Coordinates ({lat1}, {lon1}) and ({lat2}, {lon2}) are outside supported regions.")
    
    if region in _GRAPH_CACHE:
        G = _GRAPH_CACHE[region]
    else:
        region_name = region.replace(".csv", "")
        
        # Try loading high-performance serialized graph (.pkl.gz)
        G = load_serialized_graph(region_name)
        
        if G is not None:
            _GRAPH_CACHE[region] = G
            print(f"Successfully loaded and cached serialized graph for region '{region_name}'.")
        else:
            # Fallback to slow raw CSV loading
            print(f"Graph cache miss for region '{region}'. Loading nodes and edges from raw CSVs (SLOW fallback)...")
            print("Tip: Run 'python data/serialize_graphs.py' to generate optimized binary files locally.")
            
            nodes = pd.read_csv((BASE_DIR /".." /".." /"data" /"NodesnEdges" /"Nodes" /region).resolve(),
                low_memory=False
            )
            edges = pd.read_csv((BASE_DIR /".." /".." /"data" /"NodesnEdges" /"Edges" /region).resolve(),
                low_memory=False
            )
            nodes['geometry'] = nodes['geometry'].apply(wkt.loads)
            edges['geometry'] = edges['geometry'].apply(wkt.loads)

            nodes = geopandas.GeoDataFrame(nodes, geometry='geometry', crs="EPSG:4326")
            edges = geopandas.GeoDataFrame(edges, geometry='geometry', crs="EPSG:4326")

            nodes = nodes.set_index("osmid")
            edges = edges.set_index(["u", "v", "key"])

            G = ox.graph_from_gdfs(nodes, edges)
            _GRAPH_CACHE[region] = G
            print(f"Successfully compiled and cached graph from CSVs for region '{region}'.")

    orig = ox.distance.nearest_nodes(G, lon1, lat1)
    dest = ox.distance.nearest_nodes(G, lon2, lat2)

    route = nx.astar_path(
        G,
        orig,
        dest,
        weight="length"
    )
    distance = nx.path_weight(
        G,
        route,
        weight="length"
    )
    route_coords = [
        (G.nodes[node]["y"], G.nodes[node]["x"])
        for node in route
    ]
    return route_coords, distance




