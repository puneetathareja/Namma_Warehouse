"""
GRIDPOINT — price.csv from real locality price data (replaces Section 5.1).

Instead of synthesising price from Gaussian anchor bumps, this interpolates
127 observed Bangalore locality prices onto the 800 grid points.

    source   bangalore_locality_prices.csv — 127 localities, 2026 Rs/sqft
    method   smoothed inverse-distance weighting in LOG price space
    output   price.csv (point_id, latitude, longitude, price_per_sqft)

Fully deterministic. No RNG anywhere -- re-running gives identical bytes.

------------------------------------------------------------------
WHAT THE SOURCE DATA ACTUALLY IS -- read this before trusting it
------------------------------------------------------------------
Prices come from flatmap.cloud (BengaluruValue), a free Bangalore property
price map. Its own disclaimer is explicit, and it matters:

  * The figures are "best-effort real + modeled estimates", anchored to
    public portal and analyst data (99acres, Magicbricks, Anarock, Knight
    Frank, PropTiger, NHB). They are NOT registered transaction records
    and the site calls them "not a transaction-grade valuation".
  * Snapshot is June 2026.
  * The site's own city-wide heatmap is described as a spatial
    interpolation between locality centers -- which is exactly what this
    script does. Expect the output to resemble their map, because it is
    the same method applied to the same points.

So this is "real" in the sense that it reflects observed market asking
prices rather than invented Gaussian bumps. It is not ground truth. For a
hackathon dataset that is a large step up in realism; for anything with
money attached, verify independently.

Locality COORDINATES are not from the source -- flatmap.cloud publishes
them only on individual locality pages, so the centroids in
bangalore_locality_prices.csv are hand-assembled. Two were spot-checked
against the site's published values: Koramangala (theirs 12.9350/77.6260)
and Haralur Road (theirs 12.9080/77.6790), both within ~0.35 km. That
error is well below the 0.94 km grid spacing and far below the
interpolation bandwidth, so it does not move the surface materially.

------------------------------------------------------------------
METHOD, AND WHY THIS ONE
------------------------------------------------------------------
Four interpolators were compared by leave-one-out cross-validation over
the 127 localities (hold out one, predict it from the other 126):

    Gaussian kernel regression, log, h=1.5km    R2 0.529   MAPE 21.4%
    kernel ridge, log, h=4.0km lambda=0.3       R2 0.527   MAPE 22.6%
    smoothed IDW, log, p=3.5 delta=0.3km        R2 0.511   MAPE 23.1%
    locally-weighted linear regression          R2 0.28    (overfits)

R2 is capped near 0.53 whatever the method, because Bangalore prices have
genuine non-spatial cliffs: Lavelle Road at Rs 27,200 sits 1.1 km from
localities at Rs 15,000, and RT Nagar is a cheap pocket inside an
expensive ring. No smooth interpolator can reproduce that, so the choice
between the top three is not an accuracy question.

It is a FIDELITY question, and that is why smoothed IDW wins despite
ranking third. The two kernel methods shrink extremes hard toward the
local mean -- kernel ridge renders Lavelle Road at Rs 20,014 and
Indiranagar at Rs 12,923, against source values of Rs 27,200 and
Rs 19,500. A map that disagrees with its own source by 34% at a named
locality is not usable. IDW is an exact interpolator: weights diverge at
the data points, so the surface honours the source where the source
actually has an observation. Measured on this grid, the nearest grid
point to each locality reproduces that locality's price to a mean of
9.2% (p90 16.2%).

IDW also cannot overshoot: weights are positive and sum to one, so every
interpolated value is bounded by the source range [3500, 27200]. Kernel
ridge has no such guarantee and can ring past the data.

Log space, not linear: prices are right-skewed and vary multiplicatively.
Averaging in log space is what keeps a point between Rs 5,000 and
Rs 20,000 localities from being dragged to the arithmetic midpoint.

delta = 0.3 km softens the singularity at each centroid so the weight is
finite, without meaningfully denting exactness.

------------------------------------------------------------------
WHAT IS DELIBERATELY *NOT* DONE HERE
------------------------------------------------------------------
* NO corridor accessibility premium. Section 5.1 adds 3000 x
  corridor_field because synthetic affluence bumps know nothing about
  roads. Observed market prices already price in road access -- Marathahalli
  and Bellandur are expensive partly BECAUSE of the ORR. Adding the
  corridor term on top would double-count it.

* NO synthetic noise. Section 6 noise existed to stop a smooth synthetic
  field looking fake. The variation here is real and already present.
  --residual-noise adds it back if you want sub-locality texture; it is
  off by default because it fabricates variation the source does not have.

* NO min-max normalisation to [0,1]. These are rupees. Keep them rupees;
  add a normalised column at the Section 7 merge step if the renderer
  needs one.

------------------------------------------------------------------
CONSEQUENCE FOR THE REST OF THE PIPELINE -- important
------------------------------------------------------------------
Section 8 expects price, traffic, demand and labor to correlate because
all four are built from the same latent fields. Price no longer is. If
demand/traffic/labor stay synthetic, the correlation structure the
optimizer depends on is whatever falls out, not what was designed. The
validator below reports price vs affluence_field so you can see how much
of that structure survives. Two coherent options:

    (a) reground the other three in real data too (traffic from an API,
        demand from a POI/population proxy), or
    (b) rebuild the affluence field FROM this price surface -- set
        affluence = minmax(log price) and feed that into Sections 5.2-5.4,
        which restores the designed correlations on a real foundation.

(b) is the cheaper path and is probably what you want before the merge.

Usage
    python generate_price_real.py
    python generate_price_real.py --plot --diagnostics
    python generate_price_real.py --residual-noise

Dependencies: numpy, pandas, spatial_fields.py (+ matplotlib for --plot).
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import numpy as np
import pandas as pd

import spatial_fields as sf

IDW_POWER = 3.5
IDW_DELTA_KM = 0.3
RESIDUAL_NOISE_FRACTION = 0.5  # of the measured LOOCV residual sd, if enabled

SPOT_CHECKS = [
    ("Lavelle Road",  12.9698, 77.5960),
    ("Indiranagar",   12.9719, 77.6412),
    ("MG Road",       12.9758, 77.6045),
    ("Koramangala",   12.9352, 77.6245),
    ("Hebbal",        13.0358, 77.5970),
    ("Whitefield",    12.9698, 77.7500),
    ("HSR Layout",    12.9116, 77.6389),
    ("Yelahanka",     13.0980, 77.5820),
    ("Peenya",        13.0280, 77.5180),
    ("Kengeri",       12.9070, 77.4840),
]


def load_localities(path: str | Path) -> pd.DataFrame:
    loc = pd.read_csv(path)
    need = {"name", "zone", "latitude", "longitude", "price_2026"}
    missing = need - set(loc.columns)
    if missing:
        raise ValueError(f"locality file missing column(s): {sorted(missing)}")
    if loc.isna().any().any():
        raise ValueError("locality file contains nulls")
    if (loc.price_2026 <= 0).any():
        raise ValueError("locality file contains non-positive prices")
    return loc


def _weights(dist_km: np.ndarray) -> np.ndarray:
    """Smoothed IDW weights. Exact-ish at the data points, positive, and
    row-normalised downstream -- which is what bounds the output by the
    source range."""
    return (dist_km ** 2 + IDW_DELTA_KM ** 2) ** (-IDW_POWER / 2.0)


def interpolate(target_xy: np.ndarray, src_xy: np.ndarray,
                src_price: np.ndarray) -> np.ndarray:
    d = np.sqrt(((target_xy[:, None, :] - src_xy[None, :, :]) ** 2).sum(-1))
    w = _weights(d)
    log_p = np.log(src_price)
    return np.exp((w * log_p[None, :]).sum(1) / w.sum(1))


def loocv(src_xy: np.ndarray, src_price: np.ndarray):
    """Hold out each locality, predict it from the rest. This is the only
    honest accuracy figure available -- and it is PESSIMISTIC for our actual
    use, because we are filling gaps between known localities, not predicting
    unseen ones."""
    d = np.sqrt(((src_xy[:, None, :] - src_xy[None, :, :]) ** 2).sum(-1))
    log_p = np.log(src_price)
    pred = np.empty(len(src_price))
    for i in range(len(src_price)):
        keep = np.ones(len(src_price), bool)
        keep[i] = False
        w = _weights(d[i][keep])
        pred[i] = np.exp((w * log_p[keep]).sum() / w.sum())
    err = pred - src_price
    return {
        "pred": pred,
        "MAE": float(np.abs(err).mean()),
        "MAPE": float(100 * np.abs(err / src_price).mean()),
        "R2": float(1 - (err ** 2).sum() / ((src_price - src_price.mean()) ** 2).sum()),
        "log_resid_sd": float(np.std(np.log(pred) - log_p)),
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="price.csv from real locality prices")
    ap.add_argument("--grid", default="grid.csv")
    ap.add_argument("--localities", default="bangalore_locality_prices.csv")
    ap.add_argument("--out", default="price.csv")
    ap.add_argument("--residual-noise", action="store_true",
                    help="add spatially-smooth noise at the measured LOOCV "
                         "residual scale (fabricates sub-locality texture)")
    ap.add_argument("--diagnostics", action="store_true",
                    help="also write price_diagnostics.csv with nearest-locality columns")
    ap.add_argument("--plot", action="store_true")
    args = ap.parse_args()

    grid = sf.load_grid(args.grid)
    loc = load_localities(args.localities)

    to_xy = sf.projector(float(grid.latitude.mean()))
    gxy = to_xy(grid.latitude.values, grid.longitude.values)
    lxy = to_xy(loc.latitude.values, loc.longitude.values)
    lp = loc.price_2026.values.astype(float)

    price = interpolate(gxy, lxy, lp)
    cv = loocv(lxy, lp)

    if args.residual_noise:
        sd = RESIDUAL_NOISE_FRACTION * cv["log_resid_sd"]
        price = price * np.exp(sd * sf.smooth_noise(grid, "price_residual"))
        price = np.clip(price, lp.min(), lp.max())

    out = pd.DataFrame({
        "point_id": grid.point_id,
        "latitude": grid.latitude,
        "longitude": grid.longitude,
        "price_per_sqft": np.round(price).astype(int),
    })
    out_path = Path(args.out)
    out.to_csv(out_path, index=False, lineterminator="\n")
    print(f"wrote {len(out)} rows to {out_path}")

    # ---------------- validation ----------------
    print("=" * 74)
    print("VALIDATION -- price.csv from real locality data")
    print("=" * 74)
    print(f"\ngrid fingerprint : {sf.grid_fingerprint(grid)}")
    print(f"localities       : {len(loc)}   "
          f"source range Rs {lp.min():,.0f} - {lp.max():,.0f}/sqft")
    print(f"method           : smoothed IDW, log space, p={IDW_POWER}, "
          f"delta={IDW_DELTA_KM} km   (deterministic, no RNG)")

    print("\n-- interpolation accuracy (leave-one-out over 127 localities) --")
    print(f"  MAE  Rs {cv['MAE']:,.0f}/sqft     MAPE {cv['MAPE']:.1f}%     R2 {cv['R2']:.3f}")
    print("  This is the pessimistic bound: LOOCV removes the locality entirely,")
    print("  whereas on the grid we interpolate BETWEEN localities that are all")
    print("  present. R2 ~0.5 is the ceiling for any smooth interpolator on this")
    print("  data -- the residuals are real price cliffs, not model failure.")

    resid = cv["pred"] - lp
    worst = np.argsort(-np.abs(resid))[:5]
    print("\n  largest LOOCV residuals (genuine local anomalies):")
    for i in worst:
        print(f"    {loc.name[i]:<18} source Rs {lp[i]:>6,.0f}  "
              f"predicted Rs {cv['pred'][i]:>6,.0f}  ({resid[i]:+,.0f})")

    print("\n-- fidelity to source at named localities --")
    print("  (value at the nearest grid point vs the published locality price)")
    dist_to_loc = np.sqrt(((gxy[:, None, :] - lxy[None, :, :]) ** 2).sum(-1))
    fid = []
    for name, lat, lng in SPOT_CHECKS:
        li = loc.index[loc.name == name]
        j = sf.nearest_point(grid, lat, lng)
        if len(li):
            src = lp[li[0]]
            fid.append(abs(price[j] / src - 1))
            print(f"  {name:<14} source Rs {src:>6,.0f}   grid Rs {price[j]:>6,.0f}   "
                  f"({100 * (price[j] / src - 1):+5.1f}%)")
        else:
            print(f"  {name:<14} {'(not a source locality)':>22}   grid Rs {price[j]:>6,.0f}")
    allf = np.array([abs(price[int(np.argmin(dist_to_loc[:, i]))] / lp[i] - 1)
                     for i in range(len(loc))])
    print(f"  across all 127: mean {100 * allf.mean():.1f}%  p90 {100 * np.percentile(allf, 90):.1f}%")

    print("\n-- range on the 800-point grid --")
    q = np.percentile(price, [0, 5, 25, 50, 75, 95, 100])
    print("  min {:,.0f} | p05 {:,.0f} | p25 {:,.0f} | median {:,.0f} | "
          "p75 {:,.0f} | p95 {:,.0f} | max {:,.0f}".format(*q))
    print(f"  mean {price.mean():,.0f}   sd {price.std():,.0f}")
    bounded = price.min() >= lp.min() - 1 and price.max() <= lp.max() + 1
    print(f"  bounded by source range: {bounded}  "
          f"(IDW weights are positive and sum to 1, so this is guaranteed)")
    print("\n" + sf.histogram(price, bins=12))

    print("\n-- extrapolation exposure --")
    dn = dist_to_loc.min(1)
    print(f"  grid point -> nearest locality, km: median {np.median(dn):.2f}  "
          f"p90 {np.percentile(dn, 90):.2f}  max {dn.max():.2f}")
    far = int((dn > 3.0).sum())
    print(f"  points >3 km from any locality: {far} ({far / len(grid):.1%})"
          + ("  <- least trustworthy region of the map" if far else ""))

    print("\n-- effect on the designed correlation structure --")
    fields = sf.build_fields(grid)
    for nm in ("affluence", "corridor", "residential", "industrial"):
        r = float(np.corrcoef(np.log(price), fields[nm])[0, 1])
        print(f"  log(price) ~ {nm:<12} {r:+.3f}")
    print("  Sections 5.2-5.4 still derive traffic/demand/labor from the synthetic")
    print("  affluence field. The correlation above is how much of the designed")
    print("  structure survives. If it is weak, reground the other three or set")
    print("  affluence = minmax(log price) before running them. See module docstring.")

    digest = hashlib.sha256(out_path.read_bytes()).hexdigest()[:16]
    print(f"\n-- determinism --\n  price.csv sha256 : {digest}")

    if args.diagnostics:
        nearest = np.argmin(dist_to_loc, axis=1)
        dpath = out_path.with_name("price_diagnostics.csv")
        pd.DataFrame({
            "point_id": grid.point_id,
            "latitude": grid.latitude,
            "longitude": grid.longitude,
            "price_per_sqft": np.round(price).astype(int),
            "nearest_locality": loc.name.values[nearest],
            "nearest_locality_price": lp[nearest].astype(int),
            "nearest_locality_km": np.round(dn, 3),
            "zone": loc.zone.values[nearest],
        }).to_csv(dpath, index=False, lineterminator="\n")
        print(f"\nwrote {dpath}")

    if args.plot:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(8.6, 8), dpi=130)
        s = ax.scatter(grid.longitude, grid.latitude, c=price, s=26,
                       cmap="inferno", linewidths=0)
        ax.scatter(loc.longitude, loc.latitude, s=9, marker="x",
                   c="#4ad", linewidths=0.7, label="127 source localities")
        for name, lat, lng in SPOT_CHECKS:
            ax.annotate(name, (lng, lat), textcoords="offset points",
                        xytext=(5, 3), fontsize=6.5, color="white")
        ax.set_aspect(1 / np.cos(np.radians(float(grid.latitude.mean()))))
        ax.set_xlim(grid.longitude.min() - .02, grid.longitude.max() + .02)
        ax.set_ylim(grid.latitude.min() - .02, grid.latitude.max() + .02)
        ax.set_title("GRIDPOINT — price_per_sqft from 127 real locality prices")
        ax.set_facecolor("#111")
        ax.legend(loc="lower left", fontsize=7)
        fig.colorbar(s, ax=ax, shrink=0.78, label="Rs/sqft")
        fig.tight_layout()
        p = out_path.with_name("price_preview.png")
        fig.savefig(p)
        print(f"wrote {p}")


if __name__ == "__main__":
    main()
