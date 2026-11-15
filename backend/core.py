"""Computation behind the API: scenarios, cached day forecasts, app-zone aggregation, live readings.

Everything here returns plain dicts shaped like the TypeScript types in src/data/types.ts.
"""

from __future__ import annotations

import json
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

import clock

from llm.answer import WEEK_LABEL, day_knobs
from ml.features import traffic_status
from ml.predict import predict_day

ROOT = Path(__file__).resolve().parent.parent
SHARED = ROOT / "shared"
OPEN_HOUR, CLOSE_HOUR = 6, 23          # same as src/utils/time.ts; hourly slots 6..22
HOURS = list(range(OPEN_HOUR, CLOSE_HOUR))

_app = json.loads((SHARED / "app_zones.json").read_text(encoding="utf-8"))
APP_ZONES: dict[str, list[str]] = _app["app_zones"]
APP_LABELS: dict[str, str] = _app["labels"]
APP_PREFERENCE: dict[str, str] = _app["preference"]
_presets = {p["week_type"]: p for p in json.loads((SHARED / "presets.json").read_text(encoding="utf-8"))["presets"]}


# --------------------------------------------------------------------------------------------
# Small helpers
# --------------------------------------------------------------------------------------------
def format_hour(h: int) -> str:
    return f"{h % 12 or 12} {'AM' if h < 12 else 'PM'}"


def status(pct: float) -> str:
    return str(traffic_status(np.array([pct]))[0])


def current_hour() -> int:
    return min(max(clock.now().hour, OPEN_HOUR), CLOSE_HOUR - 1)


def parse_date(s: str | None) -> date:
    return date.fromisoformat(s) if s else clock.today()


# --------------------------------------------------------------------------------------------
# Scenarios. An id is a comma-separated list of tokens, e.g. "finals,rain" or "regular,event-big".
# --------------------------------------------------------------------------------------------
WEATHER_TOKENS = {"rain": "rain", "snow": "snow", "hot": "hot"}
EVENT_TOKENS = {"event-small": 0.3, "event-medium": 0.6, "event-big": 0.9}
SCENARIO_DESCRIPTIONS = {
    "normal": "A typical day for this date on the JMU calendar.",
    "first_week": "New-semester energy: everyone is trying the gym at once.",
    "midterms": "Exam pressure: fewer people, and they come later in the evening.",
    "finals": "Finals week: quiet mornings, a late-night rush, students leaving by Friday.",
    "post_new_year": "Resolution season: weights and cardio fill up fast.",
    "thanksgiving_break": "Most students are away; UREC is nearly empty.",
    "spring_break": "Most students are away; UREC is nearly empty.",
    "winter_break": "Most students are away; UREC is nearly empty.",
    "rain": "Rain pushes runners and walkers indoors onto the tracks.",
    "snow": "Snow keeps many people home, but the indoor tracks stay busy.",
    "finals,rain": "Finals week on a rainy day.",
}
PRESET_IDS = ["normal", "first_week", "midterms", "finals", "post_new_year", "thanksgiving_break", "rain", "snow", "finals,rain"]


def overrides_from_id(scenario_id: str | None) -> dict:
    out: dict = {}
    for tok in (scenario_id or "").split(","):
        tok = tok.strip()
        if tok in _presets:
            out["week_type"] = tok
        elif tok in WEATHER_TOKENS:
            out["weather"] = WEATHER_TOKENS[tok]
        elif tok in EVENT_TOKENS:
            out["event_load"] = EVENT_TOKENS[tok]
    return out


def id_from_overrides(ov: dict) -> str:
    toks = []
    if "week_type" in ov:
        toks.append(ov["week_type"])
    if ov.get("weather") in WEATHER_TOKENS:
        toks.append(ov["weather"])
    if "event_load" in ov:
        toks.append(min(EVENT_TOKENS, key=lambda k: abs(EVENT_TOKENS[k] - ov["event_load"])))
    return ",".join(toks) or "normal"


def scenario_label(scenario_id: str) -> str:
    if scenario_id == "normal":
        return "Typical day"
    ov = overrides_from_id(scenario_id)
    parts = []
    if "week_type" in ov:
        parts.append(WEEK_LABEL[ov["week_type"]][0].upper() + WEEK_LABEL[ov["week_type"]][1:])
    if "weather" in ov:
        parts.append({"rain": "Rainy day", "snow": "Snow day", "hot": "Heat wave"}[ov["weather"]])
    if "event_load" in ov:
        parts.append("Event at UREC")
    return " + ".join(parts) or "Typical day"


def scenario_dict(scenario_id: str, description: str | None = None) -> dict:
    """Shaped like the frontend's ScenarioKnobs. The old multiplier fields are neutral: the model
    applies the scenario through `knobs`, not through multipliers."""
    return {
        "id": scenario_id, "label": scenario_label(scenario_id),
        "description": description or SCENARIO_DESCRIPTIONS.get(scenario_id, scenario_label(scenario_id)),
        "occupancyMultiplier": 1, "peakBoostHours": [], "peakBoostAmount": 0,
        "knobs": overrides_from_id(scenario_id),
    }


# --------------------------------------------------------------------------------------------
# Forecasts (cached per date + scenario: a day is 425 predictions, about 25 ms)
# --------------------------------------------------------------------------------------------
@lru_cache(maxsize=256)
def day_frame(d: date, scenario_id: str | None) -> pd.DataFrame:
    df = predict_day(d, day_knobs(d, overrides_from_id(scenario_id)))
    df["expected_headcount"] = df["occupancy_pct"] / 100 * df["capacity"]
    return df


def _weighted(df: pd.DataFrame) -> float:
    """Capacity-weighted occupancy % over open zones (0 if everything is closed)."""
    open_ = df[df["is_open"]]
    cap = open_["capacity"].sum()
    return float(round(100 * open_["expected_headcount"].sum() / cap, 1)) if cap else 0.0


def app_zone_series(d: date, scenario_id: str | None, app_zone: str) -> dict[int, float]:
    df = day_frame(d, scenario_id)
    members = df[df["zone_id"].isin(APP_ZONES[app_zone])]
    return {h: _weighted(g) for h, g in members.groupby("hour")}


def overall_series(d: date, scenario_id: str | None) -> dict[int, float]:
    return {h: _weighted(g) for h, g in day_frame(d, scenario_id).groupby("hour")}


def hourly(series: dict[int, float]) -> list[dict]:
    return [{"hour": h, "label": format_hour(h), "occupancyPercent": round(series[h]), "status": status(series[h])}
            for h in HOURS]


_CAPACITY = {z["id"]: z["capacity"] for z in json.loads((SHARED / "zones.json").read_text(encoding="utf-8"))["zones"]}


def app_capacity(app_zone: str) -> int:
    return sum(_CAPACITY[z] for z in APP_ZONES[app_zone])


# --------------------------------------------------------------------------------------------
# Live readings: the simulator's 2026-27 "actual" headcounts stand in for a sensor. POST /api/reading
# (e.g. the computer-vision stretch goal) writes into the same store.
# --------------------------------------------------------------------------------------------
LIVE_READINGS = ROOT / "data" / "live" / "readings_2026-27.csv.gz"


def export_live_readings() -> None:
    """Copy the 2026-27 headcounts out of the full dataset into a small CSV for the hosted demo, which has
    neither the full dataset (not in git) nor pyarrow.  `python -c "from backend.core import export_live_readings as e; e()"`"""
    df = pd.read_parquet(ROOT / "data" / "synthetic" / "urec_hourly.parquet",
                         columns=["timestamp", "zone_id", "headcount", "academic_year"])
    df = df[(df["academic_year"] == "2026-27") & (df["headcount"] > 0)]
    LIVE_READINGS.parent.mkdir(parents=True, exist_ok=True)
    df[["timestamp", "zone_id", "headcount"]].to_csv(LIVE_READINGS, index=False, compression="gzip")


class Readings:
    def __init__(self) -> None:
        self.store: dict[tuple[date, int, str], int] = {}
        path = ROOT / "data" / "synthetic" / "urec_hourly.parquet"
        df = None
        if path.exists():
            try:
                df = pd.read_parquet(path, columns=["timestamp", "zone_id", "headcount", "academic_year"])
                df = df[df["academic_year"] == "2026-27"]
            except ImportError:                # no pyarrow (slim install): use the CSV below
                df = None
        if df is not None:
            pass
        elif LIVE_READINGS.exists():           # hosted demo: no full dataset, no pyarrow
            df = pd.read_csv(LIVE_READINGS, parse_dates=["timestamp"])
            self.zero_fill = True
        else:
            return
        for ts, z, hc in zip(df["timestamp"], df["zone_id"].astype(str), df["headcount"]):
            self.store[(ts.date(), ts.hour, z)] = int(hc)

    zero_fill = False   # the CSV leaves out zero headcounts to stay small; a missing open zone then means 0

    def put(self, d: date, hour: int, zone_id: str, headcount: int) -> None:
        self.store[(d, hour, zone_id)] = headcount

    def frame(self, d: date, hour: int) -> pd.DataFrame | None:
        """The forecast frame for that hour with headcounts replaced by readings, if every open zone has one."""
        df = day_frame(d, None)
        df = df[df["hour"] == hour].copy()
        vals = [self.store.get((d, hour, z)) for z in df["zone_id"]]
        if self.zero_fill and any(v is not None for v in vals):
            vals = [0 if v is None else v for v in vals]      # covered hour: missing means nobody there
        if any(v is None for v, o in zip(vals, df["is_open"]) if o):
            return None
        df["expected_headcount"] = [v or 0 for v in vals]
        df["occupancy_pct"] = (100 * df["expected_headcount"] / df["capacity"]).round(1)
        return df


READINGS: Readings | None = None


def readings() -> Readings:
    global READINGS
    if READINGS is None:
        READINGS = Readings()
    return READINGS


# --------------------------------------------------------------------------------------------
# Response builders (match src/data/types.ts)
# --------------------------------------------------------------------------------------------
def overview(d: date, hour: int, scenario_id: str | None) -> dict:
    """GymOverview. Uses live readings for today's current hour when there's no what-if scenario."""
    use_reading = scenario_id in (None, "normal") and d == clock.today() and hour == current_hour()
    frame = readings().frame(d, hour) if use_reading else None
    source = "reading" if frame is not None else "forecast"
    if frame is None:
        df = day_frame(d, scenario_id)
        frame = df[df["hour"] == hour]

    zones = []
    for z in APP_ZONES:
        pct = _weighted(frame[frame["zone_id"].isin(APP_ZONES[z])])
        zones.append({"zoneId": z, "label": APP_LABELS[z], "occupancyPercent": round(pct), "status": status(pct)})
    seen: set[float] = set()
    busiest = []
    for z in sorted(zones, key=lambda x: -x["occupancyPercent"]):       # skip duplicate real-zone pairs
        key = tuple(APP_ZONES[z["zoneId"]])
        if key not in seen:
            seen.add(key)
            busiest.append(z)
    overall = _weighted(frame)
    return {
        "currentHour": hour, "overallOccupancyPercent": round(overall),
        "estimatedHeadcount": int(round(frame.loc[frame["is_open"], "expected_headcount"].sum())),
        "status": status(overall), "busiestZones": busiest[:3],
        "hourlyForecast": hourly(overall_series(d, scenario_id)), "isSimulated": True, "source": source,
    }


def zone_occupancy(d: date, hour: int, scenario_id: str | None) -> list[dict]:
    out = []
    for z in APP_ZONES:
        pct = app_zone_series(d, scenario_id, z)[hour]
        out.append({"zoneId": z, "hour": hour, "occupancyPercent": round(pct),
                    "headcount": int(round(pct / 100 * app_capacity(z))), "status": status(pct)})
    return out


def candidate_hours(d: date) -> list[int]:
    hrs = [h for h in HOURS if OPEN_HOUR + 1 <= h <= CLOSE_HOUR - 3]
    if d == clock.today():
        later = [h for h in hrs if h >= clock.now().hour]
        hrs = later or hrs
    return hrs


def forecast(d: date, scenario_id: str | None, preference: str, hour: int) -> dict:
    zone_fc = {z: hourly(app_zone_series(d, scenario_id, z)) for z in APP_ZONES}
    relevant = [z for z in APP_ZONES if preference == "any" or APP_PREFERENCE[z] == preference]
    real = sorted({r for z in relevant for r in APP_ZONES[z]})
    df = day_frame(d, scenario_id)
    df = df[df["zone_id"].isin(real)]
    by_hour = {h: _weighted(g) for h, g in df.groupby("hour")}
    best = min(candidate_hours(d), key=lambda h: by_hour[h])
    end = min(best + 2, CLOSE_HOUR - 1)
    sid = scenario_id if scenario_id not in (None, "normal") else None
    who = "overall" if preference == "any" else preference
    reason = f"Forecast {who} traffic is lowest around {format_hour(best)}."
    if sid:
        reason += f" Adjusted for “{scenario_label(sid)}”."
    return {
        "date": d.isoformat(), "scenario": scenario_dict(sid) if sid else None,
        "overview": overview(d, hour, scenario_id), "zoneOccupancy": zone_occupancy(d, hour, scenario_id),
        "zoneForecasts": zone_fc,
        "recommendedWindow": {
            "startHour": best, "endHour": end, "label": f"{format_hour(best)} – {format_hour(end)}", "reason": reason,
            "expectedStatus": status(by_hour[best]), "expectedOccupancyPercent": round(by_hour[best]),
        },
        "isSimulated": True,
    }


def zone_details(app_zone: str, d: date, hour: int, scenario_id: str | None) -> dict:
    """ZoneDetails without the `zone` metadata (the frontend owns layout and colours)."""
    series = app_zone_series(d, scenario_id, app_zone)
    pct = series[hour]
    quiet = min(candidate_hours(d), key=lambda h: series[h])
    return {
        "occupancy": {"zoneId": app_zone, "hour": hour, "occupancyPercent": round(pct),
                      "headcount": int(round(pct / 100 * app_capacity(app_zone))), "status": status(pct)},
        "forecast": hourly(series), "suggestedHour": quiet, "suggestedLabel": format_hour(quiet), "isSimulated": True,
    }


def real_zone_day(d: date, scenario_id: str | None) -> list[dict]:
    """All 25 real zones x 17 hours: what the 3D map needs."""
    df = day_frame(d, scenario_id)
    return [{"zoneId": r.zone_id, "name": r.name, "floor": int(r.floor), "hour": int(r.hour), "isOpen": bool(r.is_open),
             "occupancyPercent": float(r.occupancy_pct), "headcount": int(r.headcount), "status": r.status}
            for r in df.itertuples()]
