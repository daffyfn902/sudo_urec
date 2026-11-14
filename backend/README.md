# Backend (Person 4)

FastAPI server that connects the forecaster and the language layer to the app.

```bash
pip install -r backend/requirements.txt -r ml/requirements.txt -r llm/requirements.txt
python -m sim.generate && python -m ml.train        # once: data + model (not in git)
python -m uvicorn backend.main:app --port 8000      # from the repo root
```

Then run the frontend as usual (`npm run dev`). Vite forwards `/api` to port 8000 (see `vite.config.ts`).
Interactive docs: http://localhost:8000/docs

**If the backend isn't running, the app still works:** `src/services/api.ts` falls back to the mock data and
retries the backend every 30 s. Ollama is optional too: without it, the language endpoints use the keyword rules.

## Endpoints

| | | returns |
|---|---|---|
| `GET /api/health` | live status: model, readings, and whether Ollama's model is `loaded` / `loading` / `not_loaded` / `missing` / `unavailable` | |
| `POST /api/warmup` | load the language model into memory now (do this right before a demo); returns immediately | |
| `GET /api/overview?date&hour&scenario` | one hour of a day; today's current hour uses live readings | `GymOverview` |
| `GET /api/forecast?date&scenario&preference&hour` | the whole day, per zone, plus the recommended quiet window | `ForecastResult` |
| `GET /api/zones/{appZoneId}?date&hour&scenario` | one summary zone (without layout metadata) | `ZoneDetails` minus `zone` |
| `GET /api/scenarios` | preset what-ifs | `ScenarioKnobs[]` |
| `POST /api/scenario/interpret {text}` | plain English to a scenario (Ollama + rules), or `null` if off-topic | `ScenarioKnobs` |
| `POST /api/ask {text}` | full question answering | `AskResult` |
| `GET /api/day?date&scenario` | all 25 real zones x 17 hours: for wiring the 3D map | `DayZoneReading[]` |
| `POST /api/reading {zone_id, headcount, timestamp?}` | record a live headcount (camera / computer-vision stretch goal) | |
| `GET /api/calendar` | today's week type and the next finals dates | |

Response shapes match `src/data/types.ts`.

## How it fits together

- **Scenarios** are ids made of comma-separated tokens: a week type (`finals`), weather (`rain`, `snow`, `hot`)
  and events (`event-small`, `event-medium`, `event-big`), e.g. `finals,rain`. Each day's knobs are the calendar's
  week type for that date, with the scenario's overrides on top (`llm.answer.day_knobs`).
- **Zones:** the UI still shows 6 summary zones. `shared/app_zones.json` maps each to real zones (Free Weights →
  Fitness Center, Basketball Courts → MAC 1-3, …), and a summary zone's busyness is the capacity-weighted average of
  its open real zones. Free Weights and Upstairs Strength both map to the Fitness Center, so they show the same
  numbers until the UI moves to the 25 real zones.
- **"Now" vs forecast:** for today's current hour with no what-if, `/api/overview` uses live readings (the
  simulator's 2026-27 "actual" headcounts stand in for a sensor; `POST /api/reading` overwrites them). The response has
  `source: "reading"` or `"forecast"`. Everything else comes from the model.
- **Speed:** each day's forecast is cached per date and scenario (about 25 ms to compute, then instant). The language
  endpoints take about 5 s with gemma3:4b. Ollama warms up in the background at startup; check `/api/health`.

## Not done yet

- The 3D map (`public/urec-3d.html`) still uses its own made-up curves. `GET /api/day` has the data it needs; the
  map page can send it into the iframe with `postMessage` (it already uses that for zone focus).
- No UI uses `/api/ask` yet (`api.ask()` is ready).
- Regular days all use the same preset knobs, so every regular Monday forecasts the same.
