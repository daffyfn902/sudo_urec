"""Hourly UREC headcount simulator.

headcount = capacity x daily_curve(zone, hour, weekday) x context(knobs) x zone_quirk x noise

Everything in this file is the HIDDEN ground truth: curve shapes, zone quirks, how strongly
each knob affects each category, the late-peak shift under stress, day-level and hourly
noise. The forecaster only ever sees the output table (calendar, zone, knobs, headcount),
never these parameters. Do not import from this module in the forecaster.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from .academic_calendar import AcademicYear
from .knobs import daily_knobs

SHARED = Path(__file__).resolve().parent.parent / "shared"
HOURS = np.arange(6, 23)          # hourly slots 6:00 .. 22:00, matching the frontend
LAYOUT_SEED = 7                   # zone quirks are a property of the building: same every year

# (amplitude, peak hour, width) gaussian bumps + a floor, as a fraction of capacity on a weekday
CURVES: dict[str, tuple[list[tuple[float, float, float]], float]] = {
    "weights":  ([(0.22, 7.0, 1.2), (0.30, 12.5, 1.5), (0.68, 17.5, 1.8), (0.38, 20.5, 1.3)], 0.07),
    "cardio":   ([(0.55, 7.0, 1.3), (0.40, 12.0, 1.5), (0.80, 17.0, 1.8), (0.35, 20.0, 1.5)], 0.08),
    "courts":   ([(0.08, 8.0, 1.5), (0.28, 13.0, 2.0), (0.55, 18.5, 2.0), (0.42, 21.0, 1.5)], 0.04),
    "track":    ([(0.45, 7.5, 1.5), (0.35, 12.0, 1.5), (0.65, 17.0, 2.0), (0.30, 20.0, 1.5)], 0.05),
    "climbing": ([(0.30, 14.0, 2.0), (0.70, 19.0, 2.0)], 0.05),
    "lap_pool": ([(0.65, 6.7, 0.9), (0.45, 12.0, 1.2), (0.55, 17.0, 1.4), (0.20, 19.5, 1.0)], 0.04),
    "rec_pool": ([(0.30, 13.0, 2.0), (0.55, 17.0, 2.0)], 0.04),
    "cafe":     ([(0.35, 8.5, 1.0), (0.85, 12.5, 1.3), (0.40, 17.5, 1.5)], 0.05),
    "lockers":  ([(0.35, 7.0, 1.3), (0.40, 12.5, 1.5), (0.80, 17.5, 1.8), (0.40, 20.5, 1.4)], 0.06),
    "stretch":  ([(0.30, 7.5, 1.5), (0.30, 12.5, 1.5), (0.60, 17.5, 2.0), (0.30, 20.5, 1.5)], 0.05),
    "adventure": ([(0.40, 13.0, 2.0), (0.50, 16.0, 1.5)], 0.05),
    "wellness": ([(0.30, 11.0, 2.0), (0.35, 15.0, 2.0)], 0.03),
}
ZONE_CURVE = {
    "L1_main_pool": "lap_pool", "L1_multi_pool": "rec_pool", "L1_cafe": "cafe", "L1_lockers": "lockers",
    "L4_stretch": "stretch", "L1_adventure": "adventure", "L2_wellness": "wellness",
}

# Scheduled classes: hours a class runs in each room (weekday, weekend)
CLASS_SCHEDULE = {
    "L3_mind_body_2":  ([7, 12, 17, 19], []),
    "L3_mind_body_1":  ([7, 12, 18], [10]),
    "L3_group_ex_2":   ([12, 17, 18], []),
    "L3_cycle":        ([6, 7, 12, 17, 18], [9, 10]),
    "L3_group_ex_1":   ([7, 12, 17, 18, 19], [10, 11]),
    "L3_multipurpose": ([16, 19, 20], []),
}

# How much each knob scales each category (hidden)
NOVELTY_AFFINITY = {"weights": 0.25, "cardio": 0.35, "classes": 0.35, "track": 0.15}
STRESS_AFFINITY = {"cardio": 0.25, "track": 0.30, "courts": -0.35, "classes": -0.30, "climbing": -0.30, "pool": -0.10}
WEATHER_ALL = {"clear": 1.0, "rain": 1.05, "snow": 0.75, "hot": 1.0}
WEATHER_CATEGORY = {
    "rain": {"track": 1.30, "courts": 1.12, "climbing": 1.20, "cardio": 1.10},
    "snow": {"track": 1.25},
    "hot": {"pool": 1.45, "track": 1.10},
}


@dataclass
class Zone:
    id: str
    name: str
    floor: int
    category: str
    capacity: int
    weekday_hours: tuple[int, int]
    weekend_hours: tuple[int, int]
    quirk: float = 1.0          # hidden busyness factor
    peak_offset: float = 0.0    # hidden peak timing offset (hours)


def load_zones() -> list[Zone]:
    raw = json.loads((SHARED / "zones.json").read_text(encoding="utf-8"))["zones"]
    rng = np.random.default_rng(LAYOUT_SEED)
    zones = []
    for z in raw:
        zones.append(Zone(
            id=z["id"], name=z["name"], floor=z["floor"], category=z["category"], capacity=z["capacity"],
            weekday_hours=tuple(z["hours"]["weekday"]), weekend_hours=tuple(z["hours"]["weekend"]),
            quirk=float(np.exp(rng.normal(0, 0.12))), peak_offset=float(rng.normal(0, 0.35)),
        ))
    return zones


def _curve(name: str, h: np.ndarray) -> np.ndarray:
    bumps, floor = CURVES[name]
    out = np.full_like(h, floor, dtype=float)
    for amp, mu, sd in bumps:
        out += amp * np.exp(-0.5 * ((h - mu) / sd) ** 2)
    return out


def _base_shape(z: Zone, dow: int, stress: float, rng: np.random.Generator) -> np.ndarray:
    weekend = dow >= 5
    if z.category == "classes":
        weekday_slots, weekend_slots = CLASS_SCHEDULE[z.id]
        slots = weekend_slots if weekend else weekday_slots
        fill = np.full(len(HOURS), 0.04)
        for s in slots:
            fill[HOURS == s] = rng.uniform(0.55, 0.9)
        return fill

    shift = 2.5 * stress + z.peak_offset + (1.5 if weekend else 0.0)
    shape = _curve(ZONE_CURVE.get(z.id, z.category), HOURS - shift)
    if weekend:
        shape *= 0.7
        if dow == 6:
            shape[HOURS >= 18] *= 1.1          # Sunday-evening reset crowd
    elif dow == 4:
        shape[HOURS >= 16] *= 0.75             # Friday evening is quiet
    return shape


def simulate_day(zones: list[Zone], knobs: dict, day_effect: float, rng: np.random.Generator) -> list[dict]:
    d = knobs["date"]
    dow = d.weekday()
    weekend = dow >= 5
    students, stress, novelty = knobs["students_on_campus"], knobs["academic_stress"], knobs["novelty"]
    weather, event = knobs["weather"], knobs["event_load"]

    # campus-wide demand; faculty, staff and locals keep a floor even on breaks
    demand = (0.12 + 0.88 * students ** 0.9) * (1 + 0.15 * novelty) * (1 - 0.2 * stress)
    demand *= day_effect * WEATHER_ALL[weather]
    event_hours = (HOURS >= 10) & (HOURS < 18) if weekend else (HOURS >= 18)

    rows = []
    for z in zones:
        cat = "pool" if z.category == "pool" else z.category
        mult = demand * z.quirk
        mult *= 1 + NOVELTY_AFFINITY.get(cat, 0.05) * novelty
        mult *= 1 + STRESS_AFFINITY.get(cat, 0.3 if z.id == "L1_cafe" else 0.0) * stress
        mult *= WEATHER_CATEGORY.get(weather, {}).get(cat, 1.0)

        pct = _base_shape(z, dow, stress, rng) * mult
        if cat == "courts":
            pct[event_hours] *= 1 + 1.3 * event
        elif z.id == "L1_lockers":
            pct[event_hours] *= 1 + 0.35 * event

        pct *= np.exp(rng.normal(0, 0.1, len(HOURS)))           # hour-to-hour noise
        open_h, close_h = z.weekend_hours if weekend else z.weekday_hours
        is_open = (HOURS >= open_h) & (HOURS < close_h)
        expected = np.clip(pct, 0, 1) * z.capacity
        headcount = np.where(is_open, np.minimum(rng.poisson(expected), z.capacity), 0)

        for i, h in enumerate(HOURS):
            rows.append({
                "timestamp": pd.Timestamp(d) + pd.Timedelta(hours=int(h)),
                "zone_id": z.id, "floor": z.floor, "category": z.category, "capacity": z.capacity,
                "is_open": bool(is_open[i]), "headcount": int(headcount[i]),
                "occupancy_pct": round(100 * headcount[i] / z.capacity, 1),
            })
    return rows


def simulate(fall_years: list[int], seed: int = 42) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Return (hourly, daily_knobs) tables for the given academic years."""
    zones = load_zones()
    hourly, daily = [], []
    for y in fall_years:
        rng = np.random.default_rng([seed, y])
        days = AcademicYear.for_fall_year(y).days()
        knobs_by_day = daily_knobs(days, rng)
        x = 0.0
        for day, k in zip(days, knobs_by_day):
            x = 0.6 * x + rng.normal(0, 0.06)                     # some days are just busier (AR(1))
            k = {**k, "semester": day.semester, "academic_year": f"{y}-{(y + 1) % 100:02d}"}
            daily.append(k)
            for r in simulate_day(zones, k, float(np.exp(x)), rng):
                hourly.append({**r, **{c: k[c] for c in ("week_type", "semester", "academic_year",
                    "students_on_campus", "academic_stress", "novelty", "weather", "event_load")}})

    df = pd.DataFrame(hourly)
    df.insert(1, "date", df["timestamp"].dt.date)
    df.insert(2, "hour", df["timestamp"].dt.hour)
    df.insert(3, "dow", df["timestamp"].dt.dayofweek)
    for c in ("zone_id", "category", "week_type", "semester", "academic_year", "weather"):
        df[c] = df[c].astype("category")
    return df, pd.DataFrame(daily)
