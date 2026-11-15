"""Comfort Zone API.

    uvicorn backend.main:app --reload --port 8000      (from the repo root)
    open http://localhost:8000/docs for the interactive docs

Endpoints mirror ApiService in src/data/types.ts, plus /api/ask (language layer), /api/day
(all 25 real zones for the 3D map) and /api/reading (live sensor or computer-vision input).
"""

from __future__ import annotations

import re
import threading
from contextlib import asynccontextmanager
from datetime import date, datetime

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from llm.answer import answer as llm_answer
from llm.parse import (DEFAULT_MODEL, KEEP_ALIVE, OLLAMA_URL, WEEK_WORDS, ollama_status, parse_request,
                       upcoming_finals, warm_up)
from ml.predict import load_model

import clock

from . import core, db, social

_warming = threading.Event()     # set while a background model load is running


def _warm_in_background() -> bool:
    """Start loading the Ollama model in the background (the first load can take 1-2 minutes).
    Returns False if a load is already running."""
    if _warming.is_set():
        return False
    _warming.set()

    def warm() -> None:
        try:
            warm_up()
        except httpx.HTTPError:
            pass                 # health() reports the real state
        finally:
            _warming.clear()
    threading.Thread(target=warm, daemon=True).start()
    return True


@asynccontextmanager
async def lifespan(_: FastAPI):
    load_model()                 # about 3 s, so the first request isn't slow
    core.readings()              # load the live-year readings
    if DEFAULT_MODEL:          # skipped when the language model is switched off
        _warm_in_background()
    yield


app = FastAPI(title="Comfort Zone API", version="0.1.0", lifespan=lifespan,
              description="UREC crowd forecasts for the Comfort Zone app. All data is simulated.")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(social.router)


@app.exception_handler(db.DatabaseUnavailable)
def database_unavailable(_, __) -> JSONResponse:
    """Friends, check-ins and lifts need Postgres; forecasts keep working without it."""
    return JSONResponse(status_code=503, content={
        "detail": "The database isn't running. Start it with: python -m backend.db start"})


def _hour(hour: int | None) -> int:
    return core.current_hour() if hour is None else min(max(hour, core.OPEN_HOUR), core.CLOSE_HOUR - 1)


def _date(s: str | None) -> date:
    try:
        return core.parse_date(s)
    except ValueError:
        raise HTTPException(422, f"date must be YYYY-MM-DD, got {s!r}")


def _app_zone(zone_id: str) -> str:
    if zone_id not in core.APP_ZONES:
        raise HTTPException(404, f"unknown zone {zone_id!r}; expected one of {list(core.APP_ZONES)}")
    return zone_id


# --------------------------------------------------------------------------------------------
@app.get("/api/health")
def health() -> dict:
    """Checked live on every call. ollama: loaded | loading | not_loaded | missing | unavailable."""
    status = ollama_status()
    if _warming.is_set() and status["state"] != "loaded":
        status = {"state": "loading", "detail": "loading into memory in the background"}
    return {"ok": True, "model": "loaded", "ollama": status["state"], "ollama_detail": status["detail"],
            "ollama_model": DEFAULT_MODEL, "ollama_url": OLLAMA_URL, "keep_alive": KEEP_ALIVE,
            "readings": len(core.readings().store), "database": "up" if db.is_up() else "down"}


@app.post("/api/warmup")
def warmup() -> dict:
    """Load the language model into memory now (e.g. right before a demo). Returns immediately."""
    started = _warm_in_background()
    return {"started": started, "ollama": "loading" if started or _warming.is_set() else ollama_status()["state"]}


@app.get("/api/scenarios")
def scenarios() -> list[dict]:
    return [core.scenario_dict(s) for s in core.PRESET_IDS]


@app.get("/api/overview")
def overview(date: str | None = None, hour: int | None = None, scenario: str | None = None) -> dict:
    """GymOverview for one hour of a day (default: now). Today's current hour uses live readings."""
    return core.overview(_date(date), _hour(hour), scenario)


@app.get("/api/forecast")
def forecast(date: str | None = None, scenario: str | None = None,
             preference: str = Query("any", pattern="^(any|weights|cardio|courts)$"), hour: int | None = None) -> dict:
    """ForecastResult: the whole day, per zone, plus the recommended quiet window."""
    return core.forecast(_date(date), scenario, preference, _hour(hour))


@app.get("/api/zones/{zone_id}")
def zone_details(zone_id: str, date: str | None = None, hour: int | None = None, scenario: str | None = None) -> dict:
    """ZoneDetails for one of the app's summary zones (without layout metadata)."""
    return core.zone_details(_app_zone(zone_id), _date(date), _hour(hour), scenario)


@app.get("/api/day")
def day(date: str | None = None, scenario: str | None = None) -> list[dict]:
    """All 25 real zones x 17 hours: for the 3D map."""
    return core.real_zone_day(_date(date), scenario)


class TextIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)


@app.post("/api/scenario/interpret")
def interpret(body: TextIn) -> dict | None:
    """Plain English -> a scenario the app can apply (ScenarioKnobs shape), or null if off-topic."""
    req = parse_request(body.text)
    if req.intent == "unknown" and not req.overrides:
        return None
    ov = dict(req.overrides)
    if "week_type" not in ov:
        # The scenario box is a what-if box: any week type mentioned counts as the scenario
        text = body.text.lower()
        named = next((w for w, p in WEEK_WORDS.items() if re.search(p, text)), None)
        if named:
            ov["week_type"] = named
    sid = core.id_from_overrides(ov)
    out = core.scenario_dict(sid, description=core.SCENARIO_DESCRIPTIONS.get(sid) or llm_answer(req)["understood"] or None)
    out["source"] = req.source
    return out


@app.post("/api/ask")
def ask(body: TextIn) -> dict:
    """Full question answering: {text, understood, slots, request}."""
    return llm_answer(parse_request(body.text))


class ReadingIn(BaseModel):
    zone_id: str
    headcount: int = Field(..., ge=0)
    timestamp: datetime | None = None


@app.post("/api/reading")
def reading(body: ReadingIn) -> dict:
    """Record a live headcount for one real zone (e.g. from a camera)."""
    if body.zone_id not in core._CAPACITY:
        raise HTTPException(404, f"unknown real zone {body.zone_id!r}")
    ts = body.timestamp or clock.now()
    core.readings().put(ts.date(), ts.hour, body.zone_id, min(body.headcount, core._CAPACITY[body.zone_id]))
    return {"ok": True, "zone_id": body.zone_id, "date": ts.date().isoformat(), "hour": ts.hour}


@app.get("/api/calendar")
def calendar() -> dict:
    """Today's week type and the next finals dates."""
    from llm.answer import week_type_for
    today = clock.today()
    start, end = upcoming_finals(today)
    return {"today": today.isoformat(), "week_type": week_type_for(today),
            "next_finals": [start.isoformat(), end.isoformat()]}
