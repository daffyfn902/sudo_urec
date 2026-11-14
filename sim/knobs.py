"""Turn calendar days into daily knob values (the observable context).

Each day starts from its week-type preset in shared/presets.json, then gets realistic
day-to-day variation: stress ramps up across the semester, novelty decays after the
start of a semester, students leave as finals end, plus random weather and events.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from .academic_calendar import Day

SHARED = Path(__file__).resolve().parent.parent / "shared"
KNOB_NAMES = ("students_on_campus", "academic_stress", "novelty", "weather", "event_load")
WEATHERS = ("clear", "rain", "snow", "hot")


def load_presets() -> dict[str, dict]:
    data = json.loads((SHARED / "presets.json").read_text(encoding="utf-8"))
    return {p["week_type"]: p for p in data["presets"]}


def _weather_probs(month: int) -> dict[str, float]:
    """Rough Harrisonburg, VA climate."""
    snow = {12: 0.06, 1: 0.12, 2: 0.10, 3: 0.03}.get(month, 0.0)
    hot = {8: 0.35, 9: 0.2, 5: 0.15}.get(month, 0.0)
    rain = 0.28
    return {"clear": 1 - snow - hot - rain, "rain": rain, "snow": snow, "hot": hot}


def daily_knobs(days: list[Day], rng: np.random.Generator) -> list[dict]:
    presets = load_presets()
    out: list[dict] = []
    prev_weather = "clear"
    for i, day in enumerate(days):
        p = presets[day.week_type]
        wt, d = day.week_type, day.date
        dow = d.weekday()

        # --- students on campus -------------------------------------------------
        students = p["students_on_campus"]
        if wt == "finals":                     # students leave as their exams finish
            students = 1.0 - 0.12 * dow
        elif wt == "regular" and dow == 4 and i + 3 < len(days) and days[i + 3].week_type.endswith("break"):
            students = 0.8                      # Friday before a break
        students += rng.normal(0, 0.02)

        # --- academic stress: ramps across the semester -----------------------------
        if wt in ("regular", "first_week", "post_new_year"):
            stress = 0.05 + 0.7 * day.semester_progress ** 2
        else:
            stress = p["academic_stress"]
        if wt == "midterms":
            stress = max(stress, 0.6)
        stress += rng.normal(0, 0.03)

        # --- novelty: decays over the first weeks of a semester ------------------------
        days_in = (d - (days[0].date if day.semester == "fall" else _spring_start(days))).days
        if day.week_type in ("first_week", "post_new_year") or (0 <= days_in < 35 and wt == "regular"):
            peak = 1.0 if day.semester == "fall" else 0.85
            novelty = peak * np.exp(-days_in / 14)
        else:
            novelty = p["novelty"]
        novelty += rng.normal(0, 0.02)

        # --- weather: persistent day to day ---------------------------------------------
        probs = _weather_probs(d.month)
        if prev_weather in probs and rng.random() < 0.35:
            weather = prev_weather if probs[prev_weather] > 0 else "clear"
        else:
            weather = rng.choice(WEATHERS, p=[probs[w] for w in WEATHERS])
        prev_weather = weather

        # --- events: weeknight intramurals, some weekend tournaments ---------------------
        on_campus_term = wt in ("regular", "midterms", "first_week", "post_new_year")
        if on_campus_term and dow <= 3:
            event = rng.uniform(0.25, 0.75)
        elif on_campus_term and dow >= 5 and rng.random() < 0.12:
            event = rng.uniform(0.7, 1.0)
        else:
            event = 0.0

        out.append({
            "date": d,
            "week_type": wt,
            "students_on_campus": round(float(np.clip(students, 0, 1)), 3),
            "academic_stress": round(float(np.clip(stress, 0, 1)), 3),
            "novelty": round(float(np.clip(novelty, 0, 1)), 3),
            "weather": str(weather),
            "event_load": round(float(np.clip(event, 0, 1)), 3),
        })
    return out


def _spring_start(days: list[Day]):
    return next(d.date for d in days if d.week_type == "post_new_year")
