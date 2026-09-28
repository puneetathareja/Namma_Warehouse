"""
GRIDPOINT — traffic.csv from real Bangalore traffic data (replaces Section 5.2).

------------------------------------------------------------------
READ THIS FIRST -- what "real data" means here is NOT the same as price.csv
------------------------------------------------------------------
price.csv could be built from 127 individually-priced, individually-located
Bangalore localities, interpolated point-by-point. There is no equivalent
for traffic. Every public source checked -- TomTom Traffic Index,
trafficindex.org, and general web search -- publishes ONE aggregate number
for the whole city (or "city" vs "metro" as two numbers), not a spatial
breakdown. TomTom's own page is explicit that its figures are "collected
from drivers within the larger metropolitan area... throughout the
complete road network" and reported as a single city-wide index. There is
no free, public, point-level Bangalore congestion dataset to interpolate
the way flatmap.cloud's locality prices were interpolated.

So this script does something different, and it is important the two are
not confused:

  1. SPATIAL SHAPE comes from the corridor_field in spatial_fields.py --
     i.e. from the ACTUAL alignment of Bangalore's six major roads (ORR,
     Hosur Rd, Tumkur Rd, Old Airport Rd, Bannerghatta Rd, Sarjapur Rd),
     which is real, verifiable road geometry.

  2. VALUE SCALE is anchored to TomTom's real, numeric 2025 Bengaluru
     statistics (cited below) -- so "0.90" in this dataset means
     something concrete: roughly TomTom's measured morning-rush
     congestion level.

  3. LOCAL PEAKS are placed at a curated list of REAL, NAMED junctions
     that Bangalore Traffic Police, BBMP's own Suraksha-75 junction
     programme, and repeated news reporting identify as the city's worst
     chokepoints -- with real coordinates, not invented ones. Two of them
     (Veerannapalya, Gokaldas Images Junction) carry an actual reported
     queue length used to size their bump. See HOTSPOTS below for the
     full list and sourcing.

This is a defensible, real-data-grounded traffic layer. It is NOT 800
independently-measured congestion readings, because that dataset does not
publicly exist for Bangalore. Anyone asking "where did point p427's
0.63 come from" gets an honest answer: interpolated from real road
geometry and calibrated to real citywide statistics, not measured at
p427 itself. price.csv can make a much stronger individual-point claim
than this file can, and that difference is real, not a labelling choice.

------------------------------------------------------------------
REAL NUMBERS USED, WITH SOURCES
------------------------------------------------------------------
TomTom Traffic Index, Bengaluru, 2025 (tomtom.com/traffic-index/city/bengaluru):
    average congestion level (city)        74.4%
    morning rush hour congestion            94.2%   (10km trip: 41min 6s, 14.6 km/h)
    evening rush hour congestion            115.2%   (10km trip: 45min 27s, 13.2 km/h)
    worst day (17 May 2025)                 101% avg, 183% at peak
    time lost to traffic, rush hour, 2025    168 hours/year

"Congestion level" here is TomTom's own definition: percent SLOWER than
free-flow travel time. 74.4% means a trip that takes 10 minutes free-flow
takes ~17.4 minutes typically. This is the same "how much worse than
free-flow" concept Section 5.2's traffic_index is reaching for, so no
made-up mapping is needed -- congestion_ratio/100, clipped to the plan's
[0.05, 0.98] band, IS the index.

Real named hotspots and their sourcing:
    Hebbal Junction/Flyover      -- widely reported as Bengaluru's #1
                                     most congested junction (2026 news
                                     coverage of the Silk Board flyover
                                     project explicitly ranks Silk Board
                                     "second-most congested... after
                                     Hebbal")
    Silk Board Junction          -- #2 most congested; subject of a
                                     dedicated 3.2km double-decker flyover
                                     project completed 2026; historically
                                     ~20min signal waits (Deccan Herald)
    Tin Factory Jn (Benniganahalli) -- Wikipedia: "one of the worst
                                     traffic bottlenecks in the city";
                                     coordinate verified via Benniganahalli
                                     metro station, 12.99655N 77.66828E
    Marathahalli Junction        -- BBMP Suraksha-75 official junction list
    KR Puram                     -- BBMP Suraksha-75 official junction list
    Veerannapalya Junction       -- evening queues reported at 15.8km
                                     (MM Miles, citing Bangalore Traffic
                                     Police data); also on BBMP Suraksha-75
    Gokaldas Images Junction     -- morning queues reported at 9.9km
                                     (same source); North Bangalore
    Whitefield / ITPL (Big Bazaar Jn) -- named by Bangalore Traffic Police
                                     among its 11 flagged problem areas
    Yeshwanthpur Junction        -- BBMP Suraksha-75 official junction list
    Gorguntepalya Jn (Tumkur Rd) -- BBMP Suraksha-75 official junction list
    BEL Circle                   -- BBMP Suraksha-75 official junction list
    Hudson Circle                -- named among Bangalore Traffic Police's
                                     11 flagged problem areas
    Dairy Circle                 -- named among Bangalore Traffic Police's
                                     11 flagged problem areas
    MES Railway Gate             -- named among Bangalore Traffic Police's
                                     11 flagged problem areas
    Sarjapur / Iblur signal      -- BBMP Suraksha-75 official junction list

COORDINATE CONFIDENCE varies. Tin Factory is verified to metro-station
precision. Hebbal, Silk Board, Marathahalli, Whitefield, Yeshwanthpur,
Gorguntepalya reuse the coordinates already used elsewhere in this
pipeline (spot-checked earlier against flatmap.cloud). Hudson Circle,
Dairy Circle, MES Railway Gate, BEL Circle, Veerannapalya and Gokaldas
Images Junction are hand-placed from general knowledge of their
neighbourhood and flagged HOTSPOT_CONFIDENCE below -- same tier of
confidence as the plan's own Section 3 corridor waypoints ("reasonable
approximations... not survey-grade").

------------------------------------------------------------------
FORMULA
------------------------------------------------------------------
    traffic_index = BASE
                   + CORRIDOR_COEF x corridor_field(p)
                   + hotspot_bonus(p)
    clip to [0.05, 0.98]

BASE = 0.15 -- same floor the plan itself specifies, for a quiet interior
    street with no corridor or hotspot influence at all.

CORRIDOR_COEF = 0.75, solved so that corridor_field = 1 (a point right on
    one of the six major roads, away from any named hotspot) lands at
    0.90 -- just under TomTom's measured morning-rush average of 0.942.
    That headroom is deliberate: an ordinary point on a busy road should
    read as "about as bad as a typical rush hour," and the extra severity
    of evening rush (1.152) and the worst-day peak (1.83) is reserved for
    hotspot bumps and the clip ceiling, not baked into every corridor
    point uniformly.

hotspot_bonus(p) = sum of Gaussian bumps (sigma=1.0km -- tighter than the
    corridor's 1.5km, since a junction is a point, not a road) over the
    14 real hotspots, amplitude tiered by how severely each is reported:
        tier 1 (Hebbal, Silk Board):                        amplitude 0.35
        tier 2 (Tin Factory, Veerannapalya, Marathahalli,
                 KR Puram, Whitefield):                      amplitude 0.22
        tier 3 (the rest):                                   amplitude 0.15
    Tier 1/2 amplitudes are sized so a point AT the hotspot clips at 0.98
    -- consistent with TomTom recording >100% (115.2% evening, 183% worst
    day) at real Bengaluru rush hours; the ceiling is meant to be reached,
    not merely approached.

No synthetic noise is added. Section 6 noise exists to stop a smooth
synthetic field from looking artificial; a field already built from real
road geometry and real named hotspots does not need it. --noise adds a
small amount back if you want texture between corridors.

------------------------------------------------------------------
CONSEQUENCE FOR THE REST OF THE PIPELINE
------------------------------------------------------------------
Correlation with the price surface is reported in validation below. If
you regrounded affluence_field as log(price) per generate_price_real.py's
recommendation, demand.py should derive its commute-pressure term from
THIS traffic_index rather than recomputing corridor_field independently,
so the two real-data layers stay consistent with each other.

Usage
    python generate_traffic.py
    python generate_traffic.py --plot --diagnostics
    python generate_traffic.py --noise

Dependencies: numpy, pandas, spatial_fields.py (+ matplotlib for --plot).
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import numpy as np
import pandas as pd

import spatial_fields as sf

# ---------------------------------------------------------------------------
# Real TomTom 2025 Bengaluru statistics (see module docstring for source)
# ---------------------------------------------------------------------------
TOMTOM_AVG_CONGESTION = 0.744
TOMTOM_MORNING_RUSH = 0.942
TOMTOM_EVENING_RUSH = 1.152
TOMTOM_WORST_DAY_PEAK = 1.83

BASE = 0.15
CORRIDOR_COEF = 0.75          # corridor_field=1 -> 0.90, just under morning rush
TRAFFIC_CLIP = (0.05, 0.98)
HOTSPOT_SIGMA_KM = 1.0

# name, lat, lng, tier(1/2/3), source note
# confidence: V = verified coordinate, R = reused from elsewhere in this
# pipeline (already spot-checked), A = hand-placed approximation
HOTSPOTS = [
    ("Hebbal Junction",         13.0358, 77.5970, 1, "R", "reported #1 most congested junction in Bengaluru"),
    ("Silk Board Junction",     12.9172, 77.6228, 1, "R", "reported #2 most congested; dedicated flyover project"),
    ("Tin Factory Junction",    12.9966, 77.6683, 2, "V", "Wikipedia: one of the worst bottlenecks in the city"),
    ("Veerannapalya Junction",  13.0430, 77.6180, 2, "A", "evening queues reported at 15.8km (Traffic Police data)"),
    ("Marathahalli Junction",   12.9591, 77.6974, 2, "R", "BBMP Suraksha-75 official junction list"),
    ("KR Puram",                13.0050, 77.6900, 2, "A", "BBMP Suraksha-75 official junction list"),
    ("Whitefield / Big Bazaar", 12.9698, 77.7500, 2, "R", "named in Bangalore Traffic Police's 11 flagged areas"),
    ("Yeshwanthpur Junction",   13.0230, 77.5540, 3, "R", "BBMP Suraksha-75 official junction list"),
    ("Gorguntepalya Junction",  13.0284, 77.5547, 3, "R", "BBMP Suraksha-75 official junction list"),
    ("BEL Circle",              13.0430, 77.5620, 3, "A", "BBMP Suraksha-75 official junction list"),
    ("Hudson Circle",           12.9700, 77.5820, 3, "A", "named in Bangalore Traffic Police's 11 flagged areas"),
    ("Dairy Circle",            12.9420, 77.6020, 3, "A", "named in Bangalore Traffic Police's 11 flagged areas"),
    ("MES Railway Gate",        13.0130, 77.5680, 3, "A", "named in Bangalore Traffic Police's 11 flagged areas"),
    ("Sarjapur / Iblur Signal", 12.9257, 77.6649, 3, "R", "BBMP Suraksha-75 official junction list"),
    ("Gokaldas Images Junction",13.0200, 77.5300, 3, "A", "morning queues reported at 9.9km (Traffic Police data)"),
]
TIER_AMPLITUDE = {1: 0.35, 2: 0.22, 3: 0.15}


def hotspot_bonus(grid: pd.DataFrame) -> np.ndarray:
    to_xy = sf.projector(float(grid.latitude.mean()))
    pts = to_xy(grid.latitude.values, grid.longitude.values)
    bonus = np.zeros(len(grid))
    for name, lat, lng, tier, conf, note in HOTSPOTS:
        h = to_xy([lat], [lng])[0]
        d = np.linalg.norm(pts - h, axis=1)
        bonus += TIER_AMPLITUDE[tier] * np.exp(-(d ** 2) / (2.0 * HOTSPOT_SIGMA_KM ** 2))
    return bonus


def generate(grid: pd.DataFrame, add_noise: bool = False):
    fields = sf.build_fields(grid)
    corridor = fields["corridor"]
    bonus = hotspot_bonus(grid)
    signal = BASE + CORRIDOR_COEF * corridor + bonus

    noise = np.zeros(len(grid))
    if add_noise:
        noise = 0.03 * sf.smooth_noise(grid, stream_name="traffic")

    raw = signal + noise
    traffic = np.clip(raw, *TRAFFIC_CLIP)
    return traffic, raw, signal, corridor, bonus, fields


def main() -> None:
    ap = argparse.ArgumentParser(description="traffic.csv from real Bangalore congestion data")
    ap.add_argument("--grid", default="grid.csv")
    ap.add_argument("--out", default="traffic.csv")
    ap.add_argument("--price", default="price.csv",
                    help="if present, report correlation with the real price surface")
    ap.add_argument("--noise", action="store_true", help="add a small amount of texture")
    ap.add_argument("--diagnostics", action="store_true")
    ap.add_argument("--plot", action="store_true")
    args = ap.parse_args()

    grid = sf.load_grid(args.grid)
    traffic, raw, signal, corridor, bonus, fields = generate(grid, add_noise=args.noise)

    out = pd.DataFrame({
        "point_id": grid.point_id,
        "latitude": grid.latitude,
        "longitude": grid.longitude,
        "traffic_index": np.round(traffic, 4),
    })
    out_path = Path(args.out)
    out.to_csv(out_path, index=False, lineterminator="\n")
    print(f"wrote {len(out)} rows to {out_path}")

    # ---------------- validation ----------------
    print("=" * 74)
    print("VALIDATION -- traffic.csv from real Bangalore traffic data")
    print("=" * 74)
    print(f"\ngrid fingerprint : {sf.grid_fingerprint(grid)}")
    print(f"hotspots         : {len(HOTSPOTS)} real named junctions "
          f"({sum(1 for h in HOTSPOTS if h[4]=='V')} verified coord, "
          f"{sum(1 for h in HOTSPOTS if h[4]=='R')} reused/spot-checked, "
          f"{sum(1 for h in HOTSPOTS if h[4]=='A')} hand-placed approx)")

    print("\n-- calibration against real TomTom 2025 Bengaluru numbers --")
    print(f"  citywide average (TomTom)      : {TOMTOM_AVG_CONGESTION:.3f}")
    print(f"  this grid's mean               : {traffic.mean():.3f}")
    print("     Not expected to match exactly -- TomTom's figure is a 24-hour,")
    print("     full-metro average (including near-empty small hours and calmer")
    print("     outer suburbs); this index has no time dimension and represents")
    print("     a single 'typical' snapshot within BBMP specifically, which is")
    print("     the more congested core of the metro TomTom measures.")
    print(f"  morning rush (TomTom)           : {TOMTOM_MORNING_RUSH:.3f}  <- corridor points target ~0.90, just under this")
    print(f"  evening rush (TomTom)           : {TOMTOM_EVENING_RUSH:.3f}  <- exceeds the 0.98 ceiling; hotspots are meant to clip")
    print(f"  worst-day peak (TomTom)         : {TOMTOM_WORST_DAY_PEAK:.3f}  <- shows real Bengaluru traffic DOES exceed 1.0")

    print("\n-- range on the 800-point grid --")
    q = np.percentile(traffic, [0, 5, 25, 50, 75, 95, 100])
    print("  min {:.3f} | p05 {:.3f} | p25 {:.3f} | median {:.3f} | "
          "p75 {:.3f} | p95 {:.3f} | max {:.3f}".format(*q))
    print(f"  mean {traffic.mean():.3f}   sd {traffic.std():.3f}")
    print("\n" + sf.histogram(traffic, bins=12, fmt="{:.2f}"))

    lo_hits = int((raw < TRAFFIC_CLIP[0]).sum())
    hi_hits = int((raw > TRAFFIC_CLIP[1]).sum())
    print(f"\n-- clipping --")
    print(f"  floor {TRAFFIC_CLIP[0]}: {lo_hits} pts ({lo_hits/len(traffic):.1%})")
    print(f"  ceiling {TRAFFIC_CLIP[1]}: {hi_hits} pts ({hi_hits/len(traffic):.1%})"
          + ("  -- hotspots reaching real evening-rush/worst-day severity" if hi_hits else ""))

    print("\n-- value at named hotspots (nearest grid point) --")
    for name, lat, lng, tier, conf, note in HOTSPOTS:
        j = sf.nearest_point(grid, lat, lng)
        print(f"  [{conf}] tier{tier}  {name:<26} {traffic[j]:.3f}   ({note})")

    print("\n-- quiet-periphery check --")
    far_mask = corridor < 0.02
    if far_mask.sum():
        print(f"  {far_mask.sum()} points ({far_mask.mean():.1%}) are far from every "
              f"corridor (corridor_field<0.02)")
        print(f"  their traffic_index: mean {traffic[far_mask].mean():.3f}  "
              f"max {traffic[far_mask].max():.3f}")
        print(f"  should sit near BASE={BASE} unless a hotspot happens to be nearby")

    if Path(args.price).exists():
        price = pd.read_csv(args.price).sort_values("point_id").reset_index(drop=True)
        gsorted = grid.sort_values("point_id").reset_index(drop=True)
        if (price.point_id.values == gsorted.point_id.values).all():
            r = float(np.corrcoef(traffic, np.log(price.price_per_sqft))[0, 1])
            print(f"\n-- correlation with real price.csv --")
            print(f"  traffic ~ log(price): pearson {r:+.3f}")
            print("  Both layers are now built from real data through different routes")
            print("  (price: locality interpolation; traffic: road geometry + hotspots).")
            print("  A positive correlation here is not guaranteed by construction the")
            print("  way it was for the synthetic version -- it reflects that expensive")
            print("  areas and busy roads genuinely overlap in Bangalore, or don't.")
        else:
            print("\n-- price.csv found but point_id sets don't match grid.csv; skipped --")

    digest = hashlib.sha256(out_path.read_bytes()).hexdigest()[:16]
    print(f"\n-- determinism --\n  traffic.csv sha256 : {digest}  (no RNG unless --noise)")

    if args.diagnostics:
        to_xy = sf.projector(float(grid.latitude.mean()))
        gxy = to_xy(grid.latitude.values, grid.longitude.values)
        hxy = to_xy([h[1] for h in HOTSPOTS], [h[2] for h in HOTSPOTS])
        d = np.sqrt(((gxy[:, None, :] - hxy[None, :, :]) ** 2).sum(-1))
        nearest = d.argmin(1)
        dpath = out_path.with_name("traffic_diagnostics.csv")
        pd.DataFrame({
            "point_id": grid.point_id,
            "latitude": grid.latitude,
            "longitude": grid.longitude,
            "traffic_index": np.round(traffic, 4),
            "corridor_field": np.round(corridor, 4),
            "hotspot_bonus": np.round(bonus, 4),
            "nearest_hotspot": [HOTSPOTS[i][0] for i in nearest],
            "nearest_hotspot_km": np.round(d[np.arange(len(grid)), nearest], 3),
        }).to_csv(dpath, index=False, lineterminator="\n")
        print(f"\nwrote {dpath}")

    if args.plot:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(8.6, 8), dpi=130)
        s = ax.scatter(grid.longitude, grid.latitude, c=traffic, s=26,
                       cmap="magma", linewidths=0, vmin=0.05, vmax=0.98)
        hx = [h[2] for h in HOTSPOTS]; hy = [h[1] for h in HOTSPOTS]
        ax.scatter(hx, hy, s=40, marker="x", c="#4df", linewidths=1.3,
                  label="real named hotspots")
        for name, lat, lng, tier, conf, note in HOTSPOTS:
            if tier <= 2:
                ax.annotate(name, (lng, lat), textcoords="offset points",
                            xytext=(5, 3), fontsize=6.5, color="white")
        ax.set_aspect(1 / np.cos(np.radians(float(grid.latitude.mean()))))
        ax.set_title("GRIDPOINT — traffic_index (real corridors + real hotspots, TomTom-calibrated)")
        ax.set_facecolor("#111")
        ax.legend(loc="lower left", fontsize=7)
        fig.colorbar(s, ax=ax, shrink=0.78, label="traffic_index")
        fig.tight_layout()
        p = out_path.with_name("traffic_preview.png")
        fig.savefig(p)
        print(f"wrote {p}")


if __name__ == "__main__":
    main()
