"""Turn a resolved Request into the reply the person sees, using real forecasts.

Every number comes from the forecaster; the wording comes from templates, so the reply can't
invent figures. Returns both the text and structured data (slots) for the frontend to draw.
"""

from __future__ import annotations

from datetime import date, timedelta

import pandas as pd

from ml.predict import predict_day, preset_knobs
from sim.academic_calendar import AcademicYear   # public JMU calendar, not simulator internals

from .schema import ZONE_NAMES, Request

MAX_DAYS = 14
AREA_LABEL = {"any": "UREC", "weights": "the weight room", "cardio": "cardio", "courts": "the courts",
              "track": "the tracks", "pool": "the pool", "classes": "the class studios",
              "climbing": "the climbing wall", "other": "UREC's other spaces"}
WEEK_LABEL = {"regular": "a regular week", "first_week": "the first week of classes", "midterms": "midterms",
              "finals": "finals week", "thanksgiving_break": "Thanksgiving break", "winter_break": "winter break",
              "post_new_year": "the first weeks after New Year's", "spring_break": "spring break"}


def hour_label(h: int) -> str:
    return f"{h % 12 or 12} {'AM' if h < 12 else 'PM'}"


def dot(pct: float) -> str:
    return "🔴" if pct >= 75 else "🟡" if pct >= 40 else "🟢"


def week_type_for(d: date) -> str:
    return AcademicYear.for_fall_year(d.year if d.month >= 7 else d.year - 1).label(d).week_type


def day_knobs(d: date, overrides: dict) -> dict:
    """Calendar first (what kind of week it really is), then whatever the person asked to pretend."""
    return preset_knobs(overrides.get("week_type", week_type_for(d)),
                        **{k: v for k, v in overrides.items() if k != "week_type"})


def forecast(req: Request) -> pd.DataFrame:
    """Hourly average occupancy over the zones the request is about, one row per (date, hour)."""
    days = [req.start + timedelta(i) for i in range(min((req.end - req.start).days + 1, MAX_DAYS))]
    rows = []
    for d in days:
        df = predict_day(d, day_knobs(d, req.overrides))
        df = df[df["is_open"] & df["hour"].between(req.hour_from, req.hour_to)]
        if req.zone:
            df = df[df["zone_id"] == req.zone]
        elif req.area != "any":
            df = df[df["category"] == req.area]
        g = df.groupby("hour")["occupancy_pct"].mean().round(0)
        rows += [{"date": d, "hour": int(h), "pct": float(p), "week_type": req.overrides.get("week_type", week_type_for(d))}
                 for h, p in g.items()]
    return pd.DataFrame(rows, columns=["date", "hour", "pct", "week_type"])


def understood(req: Request) -> str:
    """The "here's what I understood" line."""
    parts = []
    if "week_type" in req.overrides:
        parts.append(f"pretending it's {WEEK_LABEL[req.overrides['week_type']]}")
    if "weather" in req.overrides:
        parts.append({"rain": "🌧 rain", "snow": "❄ snow", "hot": "☀ heat", "clear": "clear skies"}[req.overrides["weather"]])
    if "event_load" in req.overrides:
        parts.append("an event at UREC")
    span = f"{req.start:%a %b %d}" + ("" if req.start == req.end else f" to {req.end:%a %b %d}")
    hours = ("right now" if req.is_now else "" if (req.hour_from, req.hour_to) == (6, 22)
             else hour_label(req.hour_from) if req.hour_from == req.hour_to
             else f"{hour_label(req.hour_from)}–{hour_label(req.hour_to)}")
    where = ZONE_NAMES[req.zone] if req.zone else AREA_LABEL[req.area]
    return " · ".join(p for p in [where, span, hours, *parts] if p)


def answer(req: Request) -> dict:
    """{'text': reply, 'understood': summary line, 'slots': [{date, hour, pct}], 'request': ...}"""
    base = {"understood": understood(req), "request": req.model_dump(mode="json"), "slots": []}
    if req.intent == "unknown":
        return {**base, "understood": "", "text": "I can only help with UREC crowd times 🙂 "
                "Try \"when's the best time to lift tomorrow?\" or \"is the pool busy tonight?\""}

    fc = forecast(req)
    where = ZONE_NAMES[req.zone] if req.zone else AREA_LABEL[req.area]
    if fc.empty:
        return {**base, "text": f"{where[0].upper() + where[1:]} is closed then. It opens at 6 AM on weekdays "
                "(8 AM on weekends), and the first hour is one of the quietest times of the day. 🟢"}
    base["slots"] = [{"date": r.date.isoformat(), "hour": r.hour, "pct": r.pct} for r in fc.itertuples()]
    multi_day = fc["date"].nunique() > 1
    when = lambda r: (f"{r.date:%a} " if multi_day else "") + hour_label(r.hour)
    lines: list[str] = []

    if req.intent == "best_time":
        quiet = fc.nsmallest(3, "pct")
        busy = fc.nlargest(1, "pct").iloc[0]
        lines.append(f"Quietest times for {where}:")
        lines += [f"{dot(r.pct)} **{when(r)}**: about {r.pct:.0f}% full" for r in quiet.itertuples()]
        if busy.pct >= 40:
            lines.append(f"Busiest: {when(busy)} (about {busy.pct:.0f}%).")

    elif req.intent == "how_busy":
        if len(fc) == 1:
            r = fc.iloc[0]
            label = "Right now" if req.is_now else f"At {when(r)}"
            lines.append(f"{label}, {where} is about **{r.pct:.0f}% full** {dot(r.pct)}.")
        else:
            lo, hi = fc.nsmallest(1, "pct").iloc[0], fc.nlargest(1, "pct").iloc[0]
            lines.append(f"{where[0].upper() + where[1:]} ranges from about {lo.pct:.0f}% to {hi.pct:.0f}% full.")
            lines.append(f"{dot(hi.pct)} Busiest: **{when(hi)}** ({hi.pct:.0f}%)")
            lines.append(f"{dot(lo.pct)} Quietest: **{when(lo)}** ({lo.pct:.0f}%)")

    else:  # overview
        if multi_day:
            daily = fc.groupby(["date", "week_type"], as_index=False)["pct"].mean()
            for r in daily.itertuples():
                tag = "" if r.week_type == "regular" else f" ({WEEK_LABEL[r.week_type]})"
                lines.append(f"{dot(r.pct)} {r.date:%a %b %d}: about {r.pct:.0f}% on average{tag}")
            q = daily.nsmallest(1, "pct").iloc[0]
            lines.append(f"Quietest day: **{q.date:%A}**.")
        else:
            lo, hi = fc.nsmallest(1, "pct").iloc[0], fc.nlargest(1, "pct").iloc[0]
            wt = fc["week_type"].iloc[0]
            lines.append(f"{where[0].upper() + where[1:]} on {fc['date'].iloc[0]:%A}"
                         + ("" if wt == "regular" else f" ({WEEK_LABEL[wt]})")
                         + f": busiest at **{hour_label(int(hi.hour))}** (about {hi.pct:.0f}%), "
                         f"quietest at **{hour_label(int(lo.hour))}** (about {lo.pct:.0f}%).")

    if (req.end - req.start).days + 1 > MAX_DAYS:
        lines.append(f"(Showing the first {MAX_DAYS} days.)")
    lines += [f"_{n}_" for n in req.notes]
    return {**base, "text": "\n".join(lines)}
