"""parse_request(text): plain English -> a resolved Request. Never raises.

    1. Ollama (local model, JSON constrained to the Extraction schema)
    2. keyword fallback if Ollama is down, slow or returns something invalid
    3. 'unknown' if the keywords don't recognise anything either

Set OLLAMA_MODEL / OLLAMA_URL to change the model or server.
"""

from __future__ import annotations

import json
import os
import re
from datetime import date, datetime, timedelta

import httpx
from pydantic import ValidationError

from sim.academic_calendar import AcademicYear   # public JMU calendar, not simulator internals

from .schema import (EVENT_LOAD, TIME_WINDOWS, ZONE_CATEGORY, ZONE_IDS, ZONE_NAMES, Extraction, Request,
                     extraction_json_schema)

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "gemma3:4b")
WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


# --------------------------------------------------------------------------------------------
# Calendar helpers
# --------------------------------------------------------------------------------------------
def academic_year(today: date) -> AcademicYear:
    return AcademicYear.for_fall_year(today.year if today.month >= 7 else today.year - 1)


def upcoming_finals(today: date) -> tuple[date, date]:
    ay = academic_year(today)
    if today <= ay.fall_finals[1]:
        return ay.fall_finals
    if today <= ay.spring_finals[1]:
        return ay.spring_finals
    return AcademicYear.for_fall_year(ay.fall_year + 1).fall_finals


def key_dates(today: date) -> str:
    ay = academic_year(today)
    f = lambda r: f"{r[0]:%a %b %d} - {r[1]:%a %b %d, %Y}"
    winter = (ay.fall_finals[1] + timedelta(days=1), ay.spring_start - timedelta(days=1))
    return "\n".join([
        f"- Thanksgiving break: {f(ay.thanksgiving)}",
        f"- Fall finals: {f(ay.fall_finals)}",
        f"- Winter break: {f(winter)}",
        f"- Spring break: {f(ay.spring_break)}",
        f"- Spring finals: {f(ay.spring_finals)}",
    ])


# --------------------------------------------------------------------------------------------
# Labels -> concrete request
# --------------------------------------------------------------------------------------------
def resolve(ex: Extraction, text: str, today: date, now_hour: int, source: str, model: str | None = None) -> Request:
    notes: list[str] = []
    if ex.scenario_week != "none" and ex.when == "finals_week":
        ex = ex.model_copy(update={"when": "today"})   # "what if it's finals" is hypothetical, not the real dates
    if ex.when == "tomorrow":
        start = end = today + timedelta(days=1)
    elif ex.when == "this_week":
        start, end = today, today + timedelta(days=6)
    elif ex.when == "next_week":
        start = today + timedelta(days=7 - today.weekday())
        end = start + timedelta(days=6)
    elif ex.when == "this_weekend":
        start = today if today.weekday() >= 5 else today + timedelta(days=5 - today.weekday())
        end = start + timedelta(days=6 - start.weekday())
    elif ex.when == "finals_week":
        start, end = upcoming_finals(today)
    elif ex.when == "weekday" and ex.weekday != "none":
        start = end = today + timedelta(days=(WEEKDAYS.index(ex.weekday) - today.weekday()) % 7)
    elif ex.when == "date":
        try:
            start = end = date.fromisoformat(ex.date)
        except ValueError:
            start = end = today
            notes.append(f"couldn't read the date {ex.date!r}; using today")
    else:
        start = end = today
    if start < today:
        notes.append("that date has passed; showing it anyway")
    if (start - today).days > 180:
        notes.append("that's more than 6 months away; the forecast is a rough guess")

    is_now = ex.time == "now"
    if is_now:
        h0 = h1 = now_hour
    elif ex.time == "custom":
        h0, h1 = sorted((max(0, min(23, ex.hour_from)), max(0, min(23, ex.hour_to))))
    else:
        h0, h1 = TIME_WINDOWS[ex.time]

    zone = ex.zone if ex.zone in ZONE_IDS else None
    area = ZONE_CATEGORY[zone] if zone else ex.area

    overrides: dict = {}
    if ex.scenario_week != "none":
        overrides["week_type"] = ex.scenario_week
    if ex.weather != "none":
        overrides["weather"] = ex.weather
    if EVENT_LOAD[ex.event] is not None:
        overrides["event_load"] = EVENT_LOAD[ex.event]

    return Request(text=text, intent=ex.intent, start=start, end=end, hour_from=h0, hour_to=h1, is_now=is_now,
                   area=area, zone=zone, overrides=overrides, source=source, model=model, extraction=ex, notes=notes)


# --------------------------------------------------------------------------------------------
# 1. Ollama
# --------------------------------------------------------------------------------------------
SYSTEM = """You turn questions about how crowded the JMU UREC gym will be into JSON labels.
Today is {today:%A, %B %d, %Y}. The current time is {now_hour}:00.
Key dates this academic year:
{key_dates}

Fill every field. Use "none"/"any" when the question doesn't mention it. Never guess.
- intent: best_time = when should I go / quietest time / good time to go; how_busy = is it busy or packed at a
  specific time; overview = show me how busy a day, week or period is; unknown = not about UREC crowds.
- when: today, tomorrow, this_week, next_week (only the words "next week"), this_weekend, finals_week (they ask
  about the real finals dates), weekday (any named day, including "next Tuesday" or "on Friday": also set weekday),
  date (a calendar date like "Dec 3": also set date as YYYY-MM-DD). Hypotheticals with no day named use today.
- time: now (right now, rn, currently), morning, midday (lunch), afternoon, evening (tonight, after dinner),
  late_night, custom (a specific clock time or range: set hour_from and hour_to in 24h, e.g. "at 6" -> 18 to 18,
  "after my 3pm class" -> 16 to 22, "at 3am" -> 3 to 3), any (not mentioned).
- area: weights (lift, weight room, bench, squat), cardio (treadmill, elliptical, bike), courts (basketball, hoops,
  volleyball, pickleball, racquetball), track (run, jog, walk laps), pool (swim, laps in the pool), classes (yoga,
  spin, group fitness), climbing, other, any.
- zone: only when a specific room is named. Rooms: {zones}.
- scenario_week: ONLY for hypotheticals like "what if it's finals" or "pretend it's spring break". If they ask about
  the actual dates ("during finals"), use when=finals_week and scenario_week=none.
- weather: only if mentioned (rain, snow, hot = heat wave). event: intramurals, tournaments or games at UREC
  (small, medium, big); none if not mentioned."""

FEW_SHOT = [
    ("best time to hit the weight room tomorrow?",
     {"intent": "best_time", "when": "tomorrow", "area": "weights"}),
    ("how crowded is the pool right now",
     {"intent": "how_busy", "time": "now", "area": "pool"}),
    ("show me what thursday looks like",
     {"intent": "overview", "when": "weekday", "weekday": "thursday"}),
    ("is MAC 2 busy at 7 tonight",
     {"intent": "how_busy", "time": "custom", "hour_from": 19, "hour_to": 19, "zone": "L2_mac2", "area": "courts"}),
    ("what if it was midterms and snowing, when should I run",
     {"intent": "best_time", "area": "track", "scenario_week": "midterms", "weather": "snow"}),
    ("how packed does cardio get during finals",
     {"intent": "overview", "when": "finals_week", "area": "cardio"}),
    ("quiet time for yoga next week in the morning?",
     {"intent": "best_time", "when": "next_week", "time": "morning", "area": "classes"}),
    ("after my 2pm lab next wednesday can I lift without it being packed",
     {"intent": "best_time", "when": "weekday", "weekday": "wednesday", "time": "custom", "hour_from": 15,
      "hour_to": 22, "area": "weights"}),
    ("pretend it's finals week, how busy is the gym at 9",
     {"intent": "how_busy", "time": "custom", "hour_from": 21, "hour_to": 21, "scenario_week": "finals"}),
    ("there's a huge intramural tournament tonight, still ok to play hoops?",
     {"intent": "how_busy", "time": "evening", "area": "courts", "event": "big"}),
    ("who won the game last night", {"intent": "unknown"}),
]


def _full(partial: dict) -> dict:
    return Extraction(**partial).model_dump()


def ollama_extract(text: str, today: date, now_hour: int, model: str = DEFAULT_MODEL, timeout: float = 30) -> Extraction:
    zones = ", ".join(f"{z} ({n})" for z, n in ZONE_NAMES.items())
    messages = [{"role": "system", "content": SYSTEM.format(today=today, now_hour=now_hour,
                                                            key_dates=key_dates(today), zones=zones)}]
    for q, a in FEW_SHOT:
        messages += [{"role": "user", "content": q}, {"role": "assistant", "content": json.dumps(_full(a))}]
    messages.append({"role": "user", "content": text})
    r = httpx.post(f"{OLLAMA_URL}/api/chat", timeout=timeout, json={
        "model": model, "messages": messages, "stream": False, "think": False, "keep_alive": "30m",
        "format": extraction_json_schema(), "options": {"temperature": 0},
    })
    r.raise_for_status()
    return Extraction.model_validate_json(r.json()["message"]["content"])


def warm_up(model: str = DEFAULT_MODEL) -> None:
    """Load the model into GPU memory (the first load can take a minute or two). Call at API startup."""
    httpx.post(f"{OLLAMA_URL}/api/generate", timeout=300, json={"model": model, "keep_alive": "30m"}).raise_for_status()


# --------------------------------------------------------------------------------------------
# 2. Keyword fallback
# --------------------------------------------------------------------------------------------
AREA_WORDS = {
    "weights": r"lift|weight|bench|squat|deadlift|dumbbell|barbell|strength",
    "cardio": r"cardio|treadmill|elliptical|stair ?master|rower|bike",
    "courts": r"hoops|basketball|court|volleyball|pickleball|racquetball|squash|badminton|futsal|mac ?\d",
    "track": r"\brun|jog|track|laps?\b|walk",
    "pool": r"swim|pool|lap swim",
    "classes": r"yoga|spin|class|zumba|pilates|group (ex|fitness)|cycle",
    "climbing": r"climb|boulder",
}
WEEK_WORDS = {"finals": r"finals?|exam", "midterms": r"midterm", "spring_break": r"spring break",
              "thanksgiving_break": r"thanksgiving", "winter_break": r"winter break|christmas",
              "first_week": r"first week", "post_new_year": r"new year|resolution"}
GYM_WORDS = "|".join([r"gym|urec|bus(?:y|ier|iest)|crowd|pack|quiet|empty|best time|when should|work ?out|exercise|go\b",
                      r"what if|rain|snow|intramural|show me|slammed|looking|" + "|".join(n.lower() for n in ZONE_NAMES.values()), *AREA_WORDS.values(), *WEEK_WORDS.values()])


MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
ZONE_NAME_PATTERNS = {zid: re.escape(name.lower()).replace(r"\ ", r"\s*") for zid, name in ZONE_NAMES.items()}
DATE_TIME_FIELDS = ("when", "weekday", "date", "time", "hour_from", "hour_to")


def keyword_extract(text: str, today: date | None = None) -> tuple[Extraction, bool, set[str]]:
    """Best-effort labels from keywords.

    Returns (extraction, recognised_anything, explicit_fields), where explicit_fields are the
    fields the text states outright (a weekday, "tonight", "at 6", a date, a named room...).
    """
    t = text.lower()
    today = today or date.today()
    has = lambda p: re.search(p, t) is not None
    if not has(GYM_WORDS):
        return Extraction(intent="unknown"), False, set()
    kw: dict = {}
    explicit: set[str] = set()

    def put(**fields):
        kw.update(fields)
        explicit.update(fields)

    # --- when -------------------------------------------------------------------------------
    hypothetical = has(r"what if|if it('s| is| was| were)|pretend|suppose|imagine")
    week = next((w for w, p in WEEK_WORDS.items() if has(p)), None)
    month_day = re.search(r"\b(" + "|".join(MONTHS) + r")[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b", t)
    slash = re.search(r"\b(\d{1,2})/(\d{1,2})\b", t)
    day = next((d for d in WEEKDAYS if has(r"\b" + d[:3] + r"(?:[a-z]*day|\b|s\b)")), None)
    if week and hypothetical:
        put(scenario_week=week)
    elif week == "finals":
        put(when="finals_week", scenario_week="none")
    if "when" not in kw:
        if month_day or slash:
            m, d = (MONTHS.index(month_day.group(1)) + 1, int(month_day.group(2))) if month_day else                    (int(slash.group(1)), int(slash.group(2)))
            try:
                dt = date(today.year, m, d)
                if (today - dt).days > 60:
                    dt = date(today.year + 1, m, d)
                put(when="date", date=dt.isoformat(), weekday="none")
            except ValueError:
                pass
    if "when" not in kw:
        if has(r"tomorrow|tmrw|\btmr"):
            put(when="tomorrow")
        elif has(r"next week"):
            put(when="next_week")
        elif has(r"weekend"):
            put(when="this_weekend")
        elif day:
            put(when="weekday", weekday=day)
        elif has(r"this week|all week|(?:^|\b(?:the|a|whole)\s+)week\b") and not week:
            put(when="this_week")
        elif has(r"today|tonight|\brn\b|right now"):
            put(when="today")

    # --- time of day -------------------------------------------------------------------------
    def to_24h(m: re.Match) -> int:
        n, ampm = int(m.group(1)), m.group(2)
        return n % 12 + (12 if ampm == "pm" or (ampm is None and 1 <= n <= 9) else 0)

    at = re.search(r"\b(?:at|around|by)\s+(\d{1,2})\s*(am|pm)?\b", t)
    after = re.search(r"\bafter\s+(?:my\s+)?(\d{1,2})\s*(am|pm)?", t)
    if has(r"right now|\brn\b|currently|at the moment"):
        put(time="now")
    elif after:
        put(time="custom", hour_from=min(22, to_24h(after) + 1), hour_to=22)
    elif at:
        put(time="custom", hour_from=to_24h(at), hour_to=to_24h(at))
    elif has(r"tonight|evening|after (dinner|class|work)"):
        put(time="evening")
    elif has(r"morning|early"):
        put(time="morning")
    elif has(r"lunch|midday|noon"):
        put(time="midday")
    elif has(r"afternoon"):
        put(time="afternoon")

    # --- what and where ------------------------------------------------------------------------
    zone = next((z for z, p in ZONE_NAME_PATTERNS.items() if has(p)), None)
    if zone:
        put(zone=zone, area=ZONE_CATEGORY[zone])
    else:
        area = next((a for a, p in AREA_WORDS.items() if has(p)), None)
        if area:
            put(area=area)

    if has(r"rain|pour|storm"):
        put(weather="rain")
    elif has(r"snow|blizzard"):
        put(weather="snow")
    elif has(r"\bhot\b|heat"):
        put(weather="hot")
    if has(r"intramural|tournament|\bgame\b|league"):
        put(event="big" if has(r"big|huge|championship") else "medium")

    # --- intent (only a guess: the LLM decides this when it's available) ------------------------
    if has(r"best|quiet|empty|when should|good time|anytime good|least|avoid|nervous|should i"):
        intent = "best_time"
    elif has(r"show|look(s|ing)? like|looking|overview|whole|all week|usually"):
        intent = "overview"
    elif has(r"busy|packed|crowd|full|slammed|\brn\b|right now"):
        intent = "how_busy"
    elif kw.get("when") in ("this_week", "next_week", "this_weekend", "finals_week", "date"):
        intent = "overview"
    else:
        intent = "best_time"
    return Extraction(intent=intent, **kw), True, explicit


def merge(llm: Extraction, kw: Extraction, recognised: bool, explicit: set[str]) -> tuple[Extraction, list[str]]:
    """LLM decides meaning; dates and times the text states outright come from the rules."""
    update: dict = {}
    if explicit & {"when", "weekday", "date"}:
        update.update(when=kw.when, weekday=kw.weekday, date=kw.date)
    if "time" in explicit:
        update.update(time=kw.time, hour_from=kw.hour_from, hour_to=kw.hour_to)
    for f in ("area", "zone", "weather", "event", "scenario_week"):
        if f in explicit and getattr(llm, f) in ("any", "none"):
            update[f] = getattr(kw, f)
    if kw.when == "finals_week" and "when" in explicit:
        update["scenario_week"] = "none"        # "during finals" means the real dates
    if llm.intent == "unknown" and recognised:
        update["intent"] = kw.intent
    if not recognised and llm.model_dump(exclude={"intent"}) == Extraction(intent="unknown").model_dump(exclude={"intent"}):
        update["intent"] = "unknown"            # no gym words and the LLM extracted nothing specific: off-topic
    fixed = [f for f, v in update.items() if getattr(llm, f) != v]
    return llm.model_copy(update=update), fixed


# --------------------------------------------------------------------------------------------
# Entry point
# --------------------------------------------------------------------------------------------
def parse_request(text: str, today: date | None = None, now_hour: int | None = None,
                  model: str | None = DEFAULT_MODEL, timeout: float = 30) -> Request:
    """model=None skips the LLM and uses keywords only."""
    now = datetime.now()
    today = today or now.date()
    now_hour = now.hour if now_hour is None else now_hour
    kw, recognised, explicit = keyword_extract(text, today)
    if model:
        try:
            llm = ollama_extract(text, today, now_hour, model, timeout)
        except (httpx.HTTPError, ValidationError, KeyError, json.JSONDecodeError):
            llm = None
        if llm is not None:
            merged, fixed = merge(llm, kw, recognised, explicit)
            req = resolve(merged, text, today, now_hour, "llm", model)
            req.rule_fixes = fixed
            return req
    return resolve(kw, text, today, now_hour, "keyword" if recognised else "default")
