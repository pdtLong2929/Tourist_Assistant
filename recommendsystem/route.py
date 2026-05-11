import osmnx as ox
import networkx as nx
import pandas as pd
import geopandas
from shapely import wkt


coord_df = pd.read_csv("NodesnEdges/coordinate_summary.csv")
def find_region(lat, lon, coord_df):

    for _, row in coord_df.iterrows():
        if (
            row["min_lat"] <= lat <= row["max_lat"]
            and
            row["min_lon"] <= lon <= row["max_lon"]
        ):
            return row["file"]

    return None

def getroute(lat1, lon1, lat2, lon2):

    region = find_region((lat1+lat2)/2, (lon1+lon2)/2, coord_df)
    nodes = pd.read_csv("NodesnEdges/Nodes/" + region)
    edges = pd.read_csv("NodesnEdges/Edges/" + region)

    nodes['geometry'] = nodes['geometry'].apply(wkt.loads)
    edges['geometry'] = edges['geometry'].apply(wkt.loads)

    nodes = geopandas.GeoDataFrame(nodes, geometry='geometry', crs="EPSG:4326")
    edges = geopandas.GeoDataFrame(edges, geometry='geometry', crs="EPSG:4326")

    nodes = nodes.set_index("osmid")
    edges = edges.set_index(["u", "v", "key"])

    G = ox.graph_from_gdfs(nodes, edges)

    orig = ox.distance.nearest_nodes(G, lon1, lat1)
    dest = ox.distance.nearest_nodes(G, lon2, lat2)

    route = nx.astar_path(
        G,
        orig,
        dest,
        weight="length"
    )

    route_coords = [
        (G.nodes[node]["y"], G.nodes[node]["x"])
        for node in route
    ]
    return route_coords


