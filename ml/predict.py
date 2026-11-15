"""What the API calls: forecast every zone and hour for one day, given that day's knobs.

    from ml.predict import predict_day, preset_knobs
    df = predict_day(date(2026, 12, 7), preset_knobs("finals", weather="rain"))

    python -m ml.predict 2026-12-07 finals      # quick look from the command line
"""

from __future__ import annotations

import json
import sys
from datetime import date
from functools import lru_cache

import numpy as np
import pandas as pd

from .features import NUMERIC_KNOBS, ROOT, SHARED, WEATHERS, day_grid, make_features, traffic_status

MODEL_PATH = ROOT / "models" / "forecaster.joblib"
TREES_PATH = ROOT / "models" / "forecaster_trees.npz"


@lru_cache(maxsize=1)
def load_model():
    """The exported numpy trees when present (no LightGBM needed: what the hosted demo uses), otherwise the
    LightGBM model. Both give the same predictions; `python -m ml.trees` re-exports after retraining."""
    if TREES_PATH.exists():
        from .trees import TreeModel
        return TreeModel(TREES_PATH)
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"{MODEL_PATH} not found: run `python -m ml.train` first")
    import joblib
    return joblib.load(MODEL_PATH)


def preset_knobs(week_type: str = "regular", **overrides) -> dict:
    """Default knobs for a week type from shared/presets.json, with optional overrides."""
    presets = {p["week_type"]: p for p in json.loads((SHARED / "presets.json").read_text(encoding="utf-8"))["presets"]}
    if week_type not in presets:
        raise ValueError(f"unknown week_type {week_type!r}; expected one of {sorted(presets)}")
    p = presets[week_type]
    return validate_knobs({**{k: p[k] for k in ("week_type", *NUMERIC_KNOBS, "weather")}, **overrides})


def validate_knobs(knobs: dict) -> dict:
    """Clamp numeric knobs to 0-1 and reject unknown weather; raises on missing keys."""
    out = dict(knobs)
    for k in NUMERIC_KNOBS:
        out[k] = float(np.clip(float(out[k]), 0.0, 1.0))
    if out["weather"] not in WEATHERS:
        raise ValueError(f"weather must be one of {WEATHERS}, got {out['weather']!r}")
    return out


def predict_day(day: date, knobs: dict) -> pd.DataFrame:
    """One row per zone and hour: zone_id, name, floor, category, hour, is_open,
    occupancy_pct, headcount, status. Closed hours are 0 and 'low'."""
    knobs = validate_knobs(knobs)
    grid = day_grid(day, knobs)
    pct = np.clip(load_model().predict(make_features(grid)), 0, 100)
    pct = np.where(grid["is_open"], np.round(pct, 1), 0.0)
    out = grid[["zone_id", "name", "floor", "category", "capacity", "hour", "is_open"]].copy()
    out["occupancy_pct"] = pct
    out["headcount"] = np.round(pct / 100 * out["capacity"]).astype(int)
    out["status"] = traffic_status(pct)
    return out


if __name__ == "__main__":
    d = date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else date.today()
    wt = sys.argv[2] if len(sys.argv) > 2 else "regular"
    res = predict_day(d, preset_knobs(wt))
    print(f"{d} ({d:%A}), {wt}: building average by hour (open zones)")
    print(res[res["is_open"]].groupby("hour")["occupancy_pct"].mean().round(1).to_string())
