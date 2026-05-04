"""
Geometry helpers for GTFS shape building.
"""

from typing import List, Tuple
import math


Coord = Tuple[float, float]  # (lat, lon)


def haversine_m(a: Coord, b: Coord) -> float:
    """Return distance in metres between two (lat, lon) points."""
    R = 6_371_000
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def cumulative_dist(coords: List[Coord]) -> List[float]:
    """Return list of cumulative distances (metres) along a polyline."""
    dists = [0.0]
    for i in range(1, len(coords)):
        dists.append(dists[-1] + haversine_m(coords[i - 1], coords[i]))
    return dists


def snap_stop_to_shape(
    stop: Coord,
    shape: List[Coord],
    shape_dists: List[float],
) -> float:
    """
    Return the shape_dist_traveled value (metres) at the closest point
    on the shape polyline to the given stop coordinate.
    """
    best_dist = float("inf")
    best_shape_dist = 0.0

    for i in range(len(shape) - 1):
        d = _point_to_segment_dist(stop, shape[i], shape[i + 1])
        if d < best_dist:
            best_dist = d
            # Interpolate position along this segment
            seg_len = haversine_m(shape[i], shape[i + 1])
            if seg_len > 0:
                proj = _project_onto_segment(stop, shape[i], shape[i + 1])
                best_shape_dist = shape_dists[i] + proj * seg_len
            else:
                best_shape_dist = shape_dists[i]

    return best_shape_dist


def _point_to_segment_dist(p: Coord, a: Coord, b: Coord) -> float:
    """Approximate planar distance from point p to segment ab (degrees)."""
    ax, ay = a[1], a[0]
    bx, by = b[1], b[0]
    px, py = p[1], p[0]
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    cx, cy = ax + t * dx, ay + t * dy
    return math.hypot(px - cx, py - cy)


def _project_onto_segment(p: Coord, a: Coord, b: Coord) -> float:
    """Return t∈[0,1] of projection of p onto segment ab."""
    ax, ay = a[1], a[0]
    bx, by = b[1], b[0]
    px, py = p[1], p[0]
    dx, dy = bx - ax, by - ay
    denom = dx * dx + dy * dy
    if denom == 0:
        return 0.0
    return max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / denom))
