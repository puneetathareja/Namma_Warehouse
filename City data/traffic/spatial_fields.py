"""
GRIDPOINT — Steps 3, 4 and 6: shared spatial machinery.

This module owns everything that must be IDENTICAL across all four
parameter scripts (price / traffic / demand / labor):

  * the local map projection
  * the 22 anchor locations and 6 road corridors
  * the four latent fields (affluence, residential, industrial, corridor)
  * the spatially-smooth noise generator
  * deterministic RNG stream management

Nothing here reads or writes grid.csv beyond loading it read-only.
grid.csv is produced once by generate_grid.py and is treated as an
immutable input, per Section 2 of the plan.

Dependencies: numpy, pandas. No shapely — the boundary test already
happened at grid-generation time, so nothing downstream needs it.

------------------------------------------------------------------
DELIBERATE DEVIATIONS FROM THE PLAN DOCUMENT
------------------------------------------------------------------
Both are reverted by passing strict=True to build_fields(), which
restores the literal Section 3 geometry.

(1) ANCHOR WEIGHTS.  Section 4 sums an unweighted Gaussian kernel over
    each anchor category.  Summing rewards geographic CLUSTERING: four
    mutually-adjacent southeast anchors (Koramangala / HSR / Bellandur /
    Sarjapur) reinforce each other, while isolated anchors get no
    neighbour contribution at all.  Measured on this 800-point grid with
    the spec's own sigma=3km, the unweighted field ranks the commercial
    anchors:

        Bellandur 14659 | Koramangala 14651 | HSR 14347 | Indiranagar
        12255 | MG Road 10974 | Sarjapur 10914 | Manyata 7827 |
        Whitefield 7610     (rupees/sqft, pre-noise)

    Section 8 requires MG Road to be near the top; it comes 5th, and
    Whitefield/ITPL comes last at 7.6k/sqft, which is simply wrong.
    The plan never states that anchors are equal-weight -- it just
    happens to sum them.  COMMERCIAL_WEIGHTS below encodes anchor
    prominence and restores the expected ordering without touching
    sigma or any Section 5 coefficient.

(2) CORRIDOR GEOMETRY.  Section 3.4's ORR is three waypoints, which
    makes it a chord rather than the ring road it represents: the
    Hebbal->Marathahalli segment misses the real carriageway by 3.0 km
    at KR Puram and 2.6 km at Hennur.  Against sigma=1.5km that is
    exp(-9/4.5) ~ 0.14 instead of ~1.0 -- the corridor vanishes exactly
    where congestion is worst, and a phantom one appears over Banaswadi.
    The whole western arc is also absent, leaving west Bangalore with no
    accessibility premium at all.  The corridors below are the SAME six
    roads with the SAME sigma and the SAME max-pooling, just traced with
    enough waypoints to follow the actual alignment.

------------------------------------------------------------------
KNOWN LIMITATIONS -- NOT fixed here, reported by the validators
------------------------------------------------------------------
* PLATEAU.  A Gaussian kernel at sigma=3km is numerically zero beyond
  ~9km from any anchor, so ~34% of grid points have affluence == 0
  exactly.  That third of the map carries no spatial signal and shows
  only noise.  Widening COMMERCIAL_SIGMA_KM to 3.5-4.0 cuts the plateau
  to 28%/21%, but sigma is a number the plan argues for explicitly and
  changing it also moves traffic and demand, so it is left alone.

* JUNCTIONS.  corridor_field max-pools, so Silk Board (ORR x Hosur Rd)
  scores 0.999 -- indistinguishable from a random midpoint of Tumkur
  Road at 1.000.  Section 5.2's commentary expects junction overlaps to
  be the traffic peak.  Harmless for price (accessibility is genuinely
  max-like: one good road is enough).  Revisit when writing traffic.py;
  a soft-max or an explicit junction term would be needed there.

* SCALE COUPLING.  orders_per_day in demand.csv is an EXTENSIVE
  quantity -- implicitly per grid cell.  Regenerate the grid at a
  different point count and total city demand silently changes.  Price
  is intensive (rupees/sqft) so it is immune; flagging it here because
  this module is shared.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Reproducibility
# ---------------------------------------------------------------------------
# One master seed, then a NAMED stream per parameter. Named streams matter:
# with a single global stream, adding traffic.py would reshuffle every draw
# made after it and silently change price.csv. SeedSequence keyed on the
# parameter name makes each parameter's noise independent of the others'
# existence and of the order scripts happen to run in.
MASTER_SEED = 20240517


def rng_for(stream_name: str) -> np.random.Generator:
    """Deterministic, independent Generator for a named stream."""
    tag = int.from_bytes(hashlib.sha256(stream_name.encode()).digest()[:4], "big")
    return np.random.default_rng(np.random.SeedSequence([MASTER_SEED, tag]))


# ---------------------------------------------------------------------------
# Projection
# ---------------------------------------------------------------------------
# Local equirectangular about the grid centroid. Over a ~35 km span at 13degN
# this tracks haversine to well under 1%, and unlike haversine it gives a
# genuine Euclidean plane -- which is what point-to-SEGMENT distance needs
# (the alternative is geodesic cross-track, which is not worth it here).
# The plan's "0.009 deg ~ 1 km in both axes" only holds because cos(13deg) =
# 0.974; it is a latitude-specific coincidence, not a general rule.
_LAT_KM = 110.574


def projector(ref_lat: float):
    lng_km = 111.320 * np.cos(np.radians(ref_lat))

    def to_xy(lat, lng) -> np.ndarray:
        lat = np.atleast_1d(np.asarray(lat, dtype=float))
        lng = np.atleast_1d(np.asarray(lng, dtype=float))
        return np.column_stack([lng * lng_km, lat * _LAT_KM])

    return to_xy


# ---------------------------------------------------------------------------
# Section 3.1 -- commercial / affluent anchors (8)
# ---------------------------------------------------------------------------
COMMERCIAL_ANCHORS = [
    ("MG Road / CBD",       12.9758, 77.6045),
    ("Koramangala",         12.9352, 77.6245),
    ("Indiranagar",         12.9719, 77.6412),
    ("HSR Layout",          12.9116, 77.6389),
    ("Whitefield / ITPL",   12.9698, 77.7500),
    ("Bellandur / Ecospace",12.9257, 77.6649),
    ("Manyata Tech Park",   13.0450, 77.6200),
    ("Sarjapur Road belt",  12.9008, 77.6870),
]

# Deviation (1). Prominence multipliers, in the same order as above.
# Rationale per anchor:
#   MG Road 1.60      -- the CBD, and isolated: no neighbour within 3km
#   Whitefield 1.75   -- ITPL is a price centre in its own right and is
#                        13km from the nearest other anchor
#   Manyata 1.25      -- large park, isolated in the north
#   Indiranagar 1.15  -- premium, partially overlaps MG Road
#   Koramangala 1.00  -- reference
#   HSR 0.95 / Bellandur 0.90 / Sarjapur 0.85 -- all four sit inside one
#                        mutually-reinforcing cluster and are already
#                        over-counted by the sum
COMMERCIAL_WEIGHTS = np.array([1.60, 1.00, 1.15, 0.95, 1.75, 0.90, 1.25, 0.85])

# Section 3.2 -- dense residential anchors (7)
RESIDENTIAL_ANCHORS = [
    ("Jayanagar",    12.9250, 77.5938),
    ("Rajajinagar",  12.9911, 77.5529),
    ("Banashankari", 12.9255, 77.5468),
    ("JP Nagar",     12.9077, 77.5851),
    ("Vijayanagar",  12.9719, 77.5292),
    ("Yelahanka",    13.1005, 77.5963),
    ("BTM Layout",   12.9166, 77.6101),
]

# Section 3.3 -- industrial / peripheral anchors (7)
#
# NOTE for whoever writes labor.py: six of these seven fall OUTSIDE the
# BBMP boundary used for grid.csv (only Peenya is inside; Electronic City
# is 1.6km out, Bommasandra 6.0km, Jigani 6.0km, Hoskote 7.5km,
# Nelamangala 11.6km, Attibele 15.2km). They still work as off-frame
# attractors pulling the city edges, which is legitimate, but it means
# industrial_field has very little dynamic range inside the sampled
# region and Section 8's "spot-check Nelamangala" is not performable --
# there are no grid points there. Unused by price.py.
INDUSTRIAL_ANCHORS = [
    ("Peenya Industrial Area",   13.0280, 77.5180),
    ("Bommasandra Industrial",   12.8153, 77.6910),
    ("Electronic City periphery",12.8452, 77.6602),
    ("Hoskote",                  13.0708, 77.7986),
    ("Nelamangala",              13.1003, 77.3956),
    ("Attibele",                 12.7783, 77.7727),
    ("Jigani Industrial Area",   12.8047, 77.6367),
]

# ---------------------------------------------------------------------------
# Section 3.4 -- traffic corridors
# ---------------------------------------------------------------------------
# Literal plan geometry, kept for --strict comparison.
CORRIDORS_STRICT = {
    "Outer Ring Road":  [(13.0358, 77.5970), (12.9591, 77.6974), (12.9172, 77.6228)],
    "Hosur Road":       [(12.9172, 77.6228), (12.8452, 77.6602), (12.7783, 77.7727)],
    "Tumkur Road":      [(13.0284, 77.5547), (13.1003, 77.3956)],
    "Old Airport Road": [(12.9611, 77.6387), (12.9591, 77.6974)],
    "Bannerghatta Road":[(12.9250, 77.5938), (12.8000, 77.5773)],
    "Sarjapur Road":    [(12.9257, 77.6649), (12.8479, 77.7862)],
}

# Deviation (2). Same six roads, traced properly. ORR is now a closed ring
# (Hebbal -> east -> Silk Board -> west -> Hebbal); the endpoints of the
# radial roads that leave BBMP are unchanged, so the in-city portions are
# what actually shift.
CORRIDORS = {
    "Outer Ring Road": [
        (13.0358, 77.5970),  # Hebbal
        (13.0430, 77.6200),  # Nagawara
        (13.0330, 77.6390),  # Hennur junction
        (13.0120, 77.6520),  # Horamavu / Banaswadi
        (12.9950, 77.6960),  # KR Puram
        (12.9591, 77.6974),  # Marathahalli
        (12.9257, 77.6649),  # Bellandur / Iblur
        (12.9210, 77.6450),  # Agara
        (12.9172, 77.6228),  # Silk Board
        (12.9060, 77.5860),  # JP Nagar / Bannerghatta Rd junction
        (12.9050, 77.5540),  # Kanakapura Road junction
        (12.9420, 77.5190),  # Nayandahalli / Mysore Road junction
        (12.9620, 77.5080),  # Nagarbhavi
        (12.9880, 77.5180),  # Sumanahalli / Magadi Road junction
        (13.0284, 77.5547),  # Goraguntepalya / Tumkur Road junction
        (13.0358, 77.5970),  # close the ring at Hebbal
    ],
    "Hosur Road": [
        (12.9172, 77.6228),  # Silk Board
        (12.8880, 77.6420),  # Bommanahalli
        (12.8452, 77.6602),  # Electronic City
        (12.8153, 77.6910),  # Bommasandra
        (12.7783, 77.7727),  # Attibele
    ],
    "Tumkur Road": [
        (13.0284, 77.5547),  # Goraguntepalya
        (13.0280, 77.5180),  # Peenya
        (13.0450, 77.4760),  # Dasanapura stretch
        (13.1003, 77.3956),  # Nelamangala
    ],
    "Old Airport Road": [
        (12.9611, 77.6387),  # Domlur
        (12.9600, 77.6640),  # HAL / Marathahalli Bridge approach
        (12.9591, 77.6974),  # Marathahalli
    ],
    "Bannerghatta Road": [
        (12.9250, 77.5938),  # Jayanagar
        (12.8980, 77.5980),  # Arekere
        (12.8650, 77.5900),  # Gottigere
        (12.8000, 77.5773),  # Bannerghatta
    ],
    "Sarjapur Road": [
        (12.9257, 77.6649),  # Iblur
        (12.9080, 77.7000),  # Kaikondrahalli
        (12.8790, 77.7420),  # Dommasandra
        (12.8479, 77.7862),  # Sarjapur
    ],
    "ITPL Main Road": [
        # Marathahalli -> Whitefield/ITPL. Not in the plan's original
        # Section 3.4 list, but real reporting on Bangalore traffic
        # (e.g. Bangalore Traffic Police data cited in 2026 coverage)
        # names Whitefield alongside ORR and Electronic City as one of
        # the city's worst-congested corridors. Without this link
        # Whitefield picks up almost no corridor signal despite being
        # one of the most bottlenecked stretches in the city.
        (12.9591, 77.6974),  # Marathahalli
        (12.9690, 77.7180),  # Kundalahalli
        (12.9698, 77.7500),  # Whitefield / ITPL
    ],
}


# ---------------------------------------------------------------------------
# Grid loading
# ---------------------------------------------------------------------------
def load_grid(path: str | Path = "grid.csv") -> pd.DataFrame:
    """Load grid.csv read-only and assert the invariants every downstream
    script depends on. Fails loudly rather than producing a subtly broken
    CSV that only shows up at the Section 7 merge step."""
    grid = pd.read_csv(path)

    missing = {"point_id", "latitude", "longitude"} - set(grid.columns)
    if missing:
        raise ValueError(f"grid.csv is missing column(s): {sorted(missing)}")
    if grid[["point_id", "latitude", "longitude"]].isna().any().any():
        raise ValueError("grid.csv contains null coordinates or ids")
    if grid.point_id.duplicated().any():
        raise ValueError("grid.csv contains duplicate point_id values")
    if grid.duplicated(["latitude", "longitude"]).any():
        raise ValueError("grid.csv contains duplicate coordinates")

    # Sort by point_id so field order never depends on the order rows were
    # written. Every parameter script does the same, which is what actually
    # guarantees row-for-row alignment across the four output CSVs.
    return grid.sort_values("point_id", kind="stable").reset_index(drop=True)


def grid_fingerprint(grid: pd.DataFrame) -> str:
    """Short hash of the point_id -> lat/lng mapping. Print it from every
    parameter script; if the four CSVs were built against different grids
    the fingerprints diverge and you catch it here, not at merge time."""
    payload = grid[["point_id", "latitude", "longitude"]].to_csv(index=False)
    return hashlib.sha256(payload.encode()).hexdigest()[:12]


# ---------------------------------------------------------------------------
# Section 4 -- latent fields
# ---------------------------------------------------------------------------
COMMERCIAL_SIGMA_KM = 3.0
RESIDENTIAL_SIGMA_KM = 4.0
INDUSTRIAL_SIGMA_KM = 5.0
CORRIDOR_SIGMA_KM = 1.5


def _minmax(v: np.ndarray) -> np.ndarray:
    lo, hi = float(v.min()), float(v.max())
    if hi - lo < 1e-12:
        raise ValueError("field is constant; cannot min-max normalise")
    return (v - lo) / (hi - lo)


def _anchor_field(pts_xy, anchors, sigma_km, to_xy, weights=None) -> np.ndarray:
    """Sum of weighted Gaussian kernels over point anchors, min-max scaled."""
    a_xy = to_xy([a[1] for a in anchors], [a[2] for a in anchors])
    d = np.sqrt(((pts_xy[:, None, :] - a_xy[None, :, :]) ** 2).sum(-1))
    k = np.exp(-(d ** 2) / (2.0 * sigma_km ** 2))
    if weights is not None:
        k = k * np.asarray(weights, dtype=float)[None, :]
    return _minmax(k.sum(axis=1))


def _point_to_segment_km(pts_xy: np.ndarray, a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Perpendicular distance to a SEGMENT, not an infinite line.

    The clip(t, 0, 1) is the whole point: without it, the projection foot
    can land beyond an endpoint and you get phantom corridor influence
    kilometres past where the road stops. This is the standard bug in
    point-to-polyline code and it is silent -- the numbers look plausible.
    """
    ab = b - a
    denom = float((ab ** 2).sum())
    if denom < 1e-12:
        return np.linalg.norm(pts_xy - a, axis=1)
    t = np.clip(((pts_xy - a) @ ab) / denom, 0.0, 1.0)
    return np.linalg.norm(pts_xy - (a + t[:, None] * ab), axis=1)


def _corridor_field(pts_xy, corridors, sigma_km, to_xy) -> np.ndarray:
    """max over corridors of exp(-d^2 / 2sigma^2), per Section 4.

    max (not sum) is the plan's choice. For price it is the right one --
    accessibility is saturating, one good road is enough and a second does
    not double the premium. For traffic it is arguably wrong; see the
    JUNCTIONS note in the module docstring.
    """
    best = np.zeros(len(pts_xy))
    for waypoints in corridors.values():
        w = to_xy([p[0] for p in waypoints], [p[1] for p in waypoints])
        d = np.min(
            [_point_to_segment_km(pts_xy, w[i], w[i + 1]) for i in range(len(w) - 1)],
            axis=0,
        )
        best = np.maximum(best, np.exp(-(d ** 2) / (2.0 * sigma_km ** 2)))
    return best  # already in (0, 1] by construction -- no rescale needed


def build_fields(grid: pd.DataFrame, strict: bool = False) -> dict[str, np.ndarray]:
    """Compute all four Section 4 latent fields for every grid point.

    strict=True reverts both deviations described in the module docstring
    (unit anchor weights, literal Section 3.4 corridor waypoints).
    """
    to_xy = projector(float(grid.latitude.mean()))
    pts = to_xy(grid.latitude.values, grid.longitude.values)

    weights = None if strict else COMMERCIAL_WEIGHTS
    corridors = CORRIDORS_STRICT if strict else CORRIDORS

    return {
        "affluence": _anchor_field(pts, COMMERCIAL_ANCHORS, COMMERCIAL_SIGMA_KM, to_xy, weights),
        "residential": _anchor_field(pts, RESIDENTIAL_ANCHORS, RESIDENTIAL_SIGMA_KM, to_xy),
        "industrial": _anchor_field(pts, INDUSTRIAL_ANCHORS, INDUSTRIAL_SIGMA_KM, to_xy),
        "corridor": _corridor_field(pts, corridors, CORRIDOR_SIGMA_KM, to_xy),
    }


# ---------------------------------------------------------------------------
# Section 6 -- spatially-smooth noise
# ---------------------------------------------------------------------------
NOISE_CORRELATION_KM = 3.0


def smooth_noise(grid: pd.DataFrame, stream_name: str,
                 correlation_km: float = NOISE_CORRELATION_KM) -> np.ndarray:
    """Zero-mean, unit-variance noise that is spatially autocorrelated.

    Section 6 suggests bilinear interpolation from every 5th grid point,
    but that is incoherent here: the grid is jittered and polygon-clipped,
    so there is no rectangular lattice left to interpolate on. Instead this
    draws directly from a Gaussian process -- a multivariate normal whose
    covariance is a Gaussian kernel of the pairwise distances. At n=800 the
    Cholesky is instantaneous and it gives exact, stated control over the
    correlation length, which interpolation-on-a-coarse-grid does not.

    correlation_km must comfortably exceed the grid spacing or the result
    degenerates back to the i.i.d. salt-and-pepper the plan forbids. This
    grid's median nearest-neighbour distance is 0.68 km, so the 3.0 km
    default is ~4x spacing. Safe.

    Each parameter passes its own stream_name, so the four noise fields are
    independent draws. Sharing one draw would inflate the correlations that
    Section 8 measures; independent draws leave them as designed.
    """
    to_xy = projector(float(grid.latitude.mean()))
    pts = to_xy(grid.latitude.values, grid.longitude.values)

    d2 = ((pts[:, None, :] - pts[None, :, :]) ** 2).sum(-1)
    cov = np.exp(-d2 / (2.0 * correlation_km ** 2))
    cov[np.diag_indices_from(cov)] += 1e-8  # nugget: keeps it positive-definite

    L = np.linalg.cholesky(cov)
    z = L @ rng_for(stream_name).standard_normal(len(pts))
    return (z - z.mean()) / z.std()


# ---------------------------------------------------------------------------
# Shared reporting helpers
# ---------------------------------------------------------------------------
def nearest_point(grid: pd.DataFrame, lat: float, lng: float) -> int:
    to_xy = projector(float(grid.latitude.mean()))
    pts = to_xy(grid.latitude.values, grid.longitude.values)
    q = to_xy([lat], [lng])[0]
    return int(np.argmin(np.linalg.norm(pts - q, axis=1)))


def histogram(values: np.ndarray, bins: int = 12, width: int = 46, fmt: str = "{:.0f}") -> str:
    counts, edges = np.histogram(values, bins=bins)
    peak = max(1, counts.max())
    lines = []
    for c, lo, hi in zip(counts, edges[:-1], edges[1:]):
        bar = "#" * int(round(width * c / peak))
        lines.append(f"    {fmt.format(lo):>8} - {fmt.format(hi):>8} | {bar:<{width}} {c:>4}")
    return "\n".join(lines)
