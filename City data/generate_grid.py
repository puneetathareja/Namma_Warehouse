"""
GRIDPOINT — Step 2: master coordinate grid generator.

Produces grid.csv: a jittered grid of points inside the real BBMP
(Bruhat Bengaluru Mahanagara Palike) city boundary — i.e. Bengaluru's
actual urban/built-up footprint, not the much larger Bangalore Urban
district (which reaches out to rural exurbs like Nelamangala, Hoskote,
Devanahalli and Attibele).

Boundary source: Datameet community's Municipal Spatial Data project,
github.com/datameet/Municipal_Spatial_Data, Bangalore/BBMP.geojson
(CC BY 4.0) — 243 official ward polygons, dissolved into one outer
boundary and simplified (Douglas-Peucker, tolerance 0.002deg) to 136
vertices. Coordinates are embedded below so this script has no runtime
network dependency and is fully reproducible offline.

IMPORTANT: run this once, fix the seed, then commit grid.csv and never
regenerate it — every other script in the pipeline (price/traffic/
demand/labor) depends on these exact point_id -> lat/lng pairs staying
stable.
"""

import csv
import random
from pathlib import Path

from shapely.geometry import Point, Polygon

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SEED = 42
TARGET_POINTS = 800             # doubled from 400 -> ~4x visual density,
                                 # since the BBMP boundary is ~3x smaller in
                                 # area than the old district boundary
GRID_SPACING_DEG = 0.009        # ~1 km near Bangalore's latitude — unchanged
JITTER_FRACTION = 0.35          # jitter each point by up to 35% of spacing — unchanged
OUTPUT_CSV = Path(__file__).parent / "grid.csv"

# Tight bounding box around the BBMP boundary — first coarse filter only.
BBOX_LAT_MIN, BBOX_LAT_MAX = 12.82, 13.15
BBOX_LNG_MIN, BBOX_LNG_MAX = 77.45, 77.79

# BBMP (Bengaluru city corporation) boundary, (lat, lng) vertex pairs, closed ring.
BBMP_CITY_BOUNDARY = [
    (12.84699, 77.54436), (12.84437, 77.54431), (12.8453, 77.53833), (12.8397, 77.53343),
    (12.83995, 77.52352), (12.86117, 77.51841), (12.87058, 77.52309), (12.87215, 77.52021),
    (12.86806, 77.51159), (12.87701, 77.50455), (12.87082, 77.49178), (12.87165, 77.48474),
    (12.87429, 77.48088), (12.8781, 77.48169), (12.88005, 77.47482), (12.88612, 77.47877),
    (12.88629, 77.48297), (12.89434, 77.47552), (12.89649, 77.47717), (12.89843, 77.47344),
    (12.88832, 77.46849), (12.8985, 77.46068), (12.90663, 77.46008), (12.90688, 77.46667),
    (12.92664, 77.47339), (12.92592, 77.4796), (12.93692, 77.48424), (12.94033, 77.47325),
    (12.94882, 77.47628), (12.94959, 77.47106), (12.96039, 77.47528), (12.96367, 77.47228),
    (12.97567, 77.47484), (12.98366, 77.47328), (12.9867, 77.46845), (13.00256, 77.47527),
    (13.00742, 77.47286), (13.02916, 77.47954), (13.03152, 77.47687), (13.04075, 77.48256),
    (13.04864, 77.48006), (13.0451, 77.49097), (13.0721, 77.49294), (13.07198, 77.4995),
    (13.07801, 77.50718), (13.07418, 77.51796), (13.07967, 77.51898), (13.08087, 77.5232),
    (13.09307, 77.52378), (13.08997, 77.54071), (13.10132, 77.54423), (13.10042, 77.55733),
    (13.10837, 77.5611), (13.11211, 77.55968), (13.12596, 77.56556), (13.12502, 77.56966),
    (13.14114, 77.57389), (13.14262, 77.57991), (13.13269, 77.58534), (13.13426, 77.60428),
    (13.12594, 77.6306), (13.11342, 77.63862), (13.10627, 77.63702), (13.10466, 77.65032),
    (13.08689, 77.6427), (13.08628, 77.64652), (13.07479, 77.65117), (13.06006, 77.65189),
    (13.05727, 77.64691), (13.04822, 77.64724), (13.04684, 77.65614), (13.07461, 77.65649),
    (13.06821, 77.65966), (13.0659, 77.66702), (13.05081, 77.66425), (13.05249, 77.67981),
    (13.05011, 77.68397), (13.0229, 77.68383), (13.02198, 77.68859), (13.02717, 77.69857),
    (13.0253, 77.70915), (13.03195, 77.71496), (13.03411, 77.72145), (13.03241, 77.72485),
    (13.02593, 77.72515), (13.01982, 77.73009), (13.01054, 77.72808), (13.00682, 77.74709),
    (13.01273, 77.74788), (13.01007, 77.75601), (13.00285, 77.76347), (13.00265, 77.76858),
    (13.01486, 77.77285), (13.00638, 77.77337), (13.0057, 77.77589), (13.00271, 77.77246),
    (12.98519, 77.77691), (12.98046, 77.77467), (12.97856, 77.77843), (12.97497, 77.77616),
    (12.97048, 77.77867), (12.97089, 77.78326), (12.96701, 77.7842), (12.96809, 77.77743),
    (12.95993, 77.76496), (12.92876, 77.76459), (12.9253, 77.75227), (12.91977, 77.74579),
    (12.91363, 77.74467), (12.9145, 77.72777), (12.90657, 77.72628), (12.90806, 77.70835),
    (12.90199, 77.7069), (12.90645, 77.68685), (12.90256, 77.68747), (12.89366, 77.67409),
    (12.87982, 77.67403), (12.8803, 77.67104), (12.87258, 77.67532), (12.86825, 77.67289),
    (12.85218, 77.65028), (12.85115, 77.64307), (12.86359, 77.64192), (12.86491, 77.63884),
    (12.85691, 77.62906), (12.85753, 77.61684), (12.85127, 77.6091), (12.84607, 77.60922),
    (12.84916, 77.59562), (12.83458, 77.59153), (12.83349, 77.58702), (12.83826, 77.57904),
    (12.83902, 77.56219), (12.84153, 77.55728), (12.84803, 77.55449), (12.84699, 77.54436),
]


def load_boundary() -> Polygon:
    # shapely Polygon expects (x, y) = (lng, lat)
    return Polygon([(lng, lat) for lat, lng in BBMP_CITY_BOUNDARY])


def generate_jittered_grid(spacing: float, jitter_fraction: float) -> list[tuple[float, float]]:
    """Regular grid over the bbox, each point jittered so it doesn't look mechanical."""
    n_lat_steps = int((BBOX_LAT_MAX - BBOX_LAT_MIN) / spacing) + 1
    n_lng_steps = int((BBOX_LNG_MAX - BBOX_LNG_MIN) / spacing) + 1

    points = []
    for i in range(n_lat_steps):
        base_lat = BBOX_LAT_MIN + i * spacing
        for j in range(n_lng_steps):
            base_lng = BBOX_LNG_MIN + j * spacing
            jitter_lat = random.uniform(-jitter_fraction, jitter_fraction) * spacing
            jitter_lng = random.uniform(-jitter_fraction, jitter_fraction) * spacing
            points.append((base_lat + jitter_lat, base_lng + jitter_lng))
    return points


def filter_to_boundary(points, polygon: Polygon):
    return [(lat, lng) for lat, lng in points if polygon.contains(Point(lng, lat))]


def main():
    random.seed(SEED)
    polygon = load_boundary()
    assert polygon.is_valid, "Boundary polygon is self-intersecting or otherwise invalid"

    spacing = GRID_SPACING_DEG
    points: list[tuple[float, float]] = []

    # Tighten spacing and retry if the first pass falls short of the target,
    # per Section 2 step 4 of the plan.
    for attempt in range(8):
        raw = generate_jittered_grid(spacing, JITTER_FRACTION)
        points = filter_to_boundary(raw, polygon)
        if len(points) >= TARGET_POINTS:
            break
        spacing *= 0.9

    if len(points) < TARGET_POINTS:
        raise RuntimeError(
            f"Only generated {len(points)} points inside the boundary after "
            f"tightening spacing to {spacing:.5f}; target was {TARGET_POINTS}. "
            f"Lower JITTER_FRACTION or TARGET_POINTS, or allow more attempts."
        )

    # Deterministic subsample down to exactly TARGET_POINTS
    random.shuffle(points)
    points = points[:TARGET_POINTS]
    points.sort()  # readability only: order the output file by lat then lng

    with open(OUTPUT_CSV, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["point_id", "latitude", "longitude"])
        for i, (lat, lng) in enumerate(points, start=1):
            writer.writerow([f"p{i:03d}", round(lat, 6), round(lng, 6)])

    lats = [p[0] for p in points]
    lngs = [p[1] for p in points]
    print(f"Wrote {len(points)} points to {OUTPUT_CSV}")
    print(f"  seed={SEED}, final grid spacing={spacing:.5f} deg (~{spacing / 0.009:.2f} km)")
    print(f"  lat range: {min(lats):.5f} - {max(lats):.5f}")
    print(f"  lng range: {min(lngs):.5f} - {max(lngs):.5f}")


if __name__ == "__main__":
    main()
