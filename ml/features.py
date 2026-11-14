"""Feature pipeline shared by training and the API, so the two can't drift apart.

Inputs are only things you'd know ahead of time: calendar (hour, weekday), the zone (from
shared/zones.json) and the day's knobs. No lagged headcounts, so the same model can answer
what-if questions for days that never happened. Never import sim.simulator here: its
parameters are the hidden ground truth.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SHARED = ROOT / "shared"
HOURS = list(range(6, 23))

_zones_doc = json.loads((SHARED / "zones.json").read_text(encoding="utf-8"))
_schema = json.loads((SHARED / "knobs.schema.json").read_text(encoding="utf-8"))
ZONES: list[dict] = _zones_doc["zones"]
ZONE_IDS = [z["id"] for z in ZONES]
CATEGORIES: list[str] = _zones_doc["categories"]
WEATHERS: list[str] = _schema["properties"]["weather"]["enum"]
NUMERIC_KNOBS = ["students_on_campus", "academic_stress", "novelty", "event_load"]

FEATURES = ["hour", "dow", "is_weekend", "zone_id", "category", "floor", "capacity",
            *NUMERIC_KNOBS, "weather"]
CATEGORICAL = ["zone_id", "category", "weather"]


def make_features(df: pd.DataFrame) -> pd.DataFrame:
    """Model inputs from a table with hour, dow, zone_id, category, floor, capacity and knob columns."""
    X = pd.DataFrame({
        "hour": df["hour"].astype(int).to_numpy(),
        "dow": df["dow"].astype(int).to_numpy(),
        "is_weekend": (df["dow"].astype(int) >= 5).astype(int).to_numpy(),
        "zone_id": pd.Categorical(df["zone_id"].astype(str), categories=ZONE_IDS),
        "category": pd.Categorical(df["category"].astype(str), categories=CATEGORIES),
        "floor": df["floor"].astype(int).to_numpy(),
        "capacity": df["capacity"].astype(int).to_numpy(),
        **{k: df[k].astype(float).to_numpy() for k in NUMERIC_KNOBS},
        "weather": pd.Categorical(df["weather"].astype(str), categories=WEATHERS),
    })
    return X[FEATURES]


def day_grid(day: date, knobs: dict) -> pd.DataFrame:
    """Every zone x hour for one day, with is_open from zones.json: the frame the API predicts on."""
    dow = day.weekday()
    rows = []
    for z in ZONES:
        open_h, close_h = z["hours"]["weekend" if dow >= 5 else "weekday"]
        for h in HOURS:
            rows.append({
                "date": day, "hour": h, "dow": dow, "zone_id": z["id"], "name": z["name"],
                "category": z["category"], "floor": z["floor"], "capacity": z["capacity"],
                "is_open": open_h <= h < close_h,
                **{k: knobs[k] for k in (*NUMERIC_KNOBS, "weather")},
            })
    return pd.DataFrame(rows)


def traffic_status(pct: np.ndarray | pd.Series) -> np.ndarray:
    """Same cutoffs as the frontend (src/utils/traffic.ts): >=75 high, >=40 moderate."""
    pct = np.asarray(pct)
    return np.where(pct >= 75, "high", np.where(pct >= 40, "moderate", "low"))
