"""What the LLM (or the keyword fallback) extracts, and the resolved request the app acts on.

The LLM only picks labels (intent, when, time of day, area...). It never writes dates, hours
or knob numbers: code in resolve() turns the labels into concrete values. Small models pick
labels reliably and get date arithmetic wrong.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

SHARED = Path(__file__).resolve().parent.parent / "shared"
_zones = json.loads((SHARED / "zones.json").read_text(encoding="utf-8"))
ZONE_IDS: list[str] = [z["id"] for z in _zones["zones"]]
ZONE_NAMES: dict[str, str] = {z["id"]: z["name"] for z in _zones["zones"]}
ZONE_CATEGORY: dict[str, str] = {z["id"]: z["category"] for z in _zones["zones"]}
CATEGORIES: list[str] = _zones["categories"]

Intent = Literal["best_time", "how_busy", "overview", "unknown"]
When = Literal["today", "tomorrow", "this_week", "next_week", "this_weekend", "finals_week", "weekday", "date"]
Weekday = Literal["none", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
TimeOfDay = Literal["any", "now", "morning", "midday", "afternoon", "evening", "late_night", "custom"]
Area = Literal["any", "weights", "cardio", "courts", "track", "pool", "classes", "climbing", "other"]
ScenarioWeek = Literal["none", "regular", "first_week", "midterms", "finals", "thanksgiving_break",
                       "winter_break", "post_new_year", "spring_break"]
Weather = Literal["none", "clear", "rain", "snow", "hot"]
Event = Literal["none", "small", "medium", "big"]

# Fixed meanings so the LLM never has to produce numbers
TIME_WINDOWS = {"any": (6, 22), "morning": (6, 11), "midday": (11, 14), "afternoon": (13, 17),
                "evening": (17, 22), "late_night": (20, 22)}
EVENT_LOAD = {"none": None, "small": 0.3, "medium": 0.6, "big": 0.9}


class Extraction(BaseModel):
    """Exactly what the LLM fills in. Kept flat with 'none' sentinels: easiest for a small model."""
    intent: Intent
    when: When = "today"
    weekday: Weekday = "none"
    date: str = Field("", description="YYYY-MM-DD, only when when == 'date'")
    time: TimeOfDay = "any"
    hour_from: int = Field(0, description="24h hour, only when time == 'custom'")
    hour_to: int = Field(0, description="24h hour, only when time == 'custom'")
    area: Area = "any"
    zone: str = Field("none", description="a zone id, only when a specific room is named")
    scenario_week: ScenarioWeek = "none"
    weather: Weather = "none"
    event: Event = "none"


class Request(BaseModel):
    """Resolved request: concrete dates and hours the answer code can use directly."""
    text: str
    intent: Intent
    start: date
    end: date
    hour_from: int
    hour_to: int
    is_now: bool = False
    area: str = "any"
    zone: str | None = None
    overrides: dict = Field(default_factory=dict)   # knob overrides: week_type, weather, event_load
    source: Literal["llm", "keyword", "default"]
    model: str | None = None
    extraction: Extraction | None = None
    rule_fixes: list[str] = Field(default_factory=list)   # LLM fields overridden by explicit dates/times in the text
    notes: list[str] = Field(default_factory=list)


def extraction_json_schema() -> dict:
    """JSON schema passed to Ollama's `format`, so it can only produce valid labels."""
    schema = Extraction.model_json_schema()
    schema["properties"]["zone"] = {"enum": ["none", *ZONE_IDS]}
    schema["required"] = list(Extraction.model_fields)
    return schema
