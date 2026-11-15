# UREC Radar

**See how busy JMU's UREC is right now, and find a quieter time to go.**

UREC Radar forecasts how crowded every part of the University Recreation Center will be, hour by hour. You can ask
questions in plain English, explore the building in 3D, and plan a workout with friends. The idea behind it: the gym is
intimidating for new students, and a quiet first visit makes it easier to come back.

**Try it:** https://urec-radar.vercel.app

> All crowd numbers are **simulated**: there's no live UREC headcount feed. See [How it works](#how-it-works) and
> [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) for how the data is made and how well the model does.

## What's in the app

| Screen | What it does |
|---|---|
| **Home** | How full UREC is right now, the busiest zones, today's hourly forecast, an **Ask about crowds** box ("I'm new and nervous, when's the quietest time to try the weight room this week?"), and which friends are at UREC |
| **Map** | A 3D model of all four floors, traced from UREC's floor plans, with 25 zones colored by the forecast, walking people, an exterior view and a time slider |
| **Explore** | 13 low-pressure "try something new" challenges, matched to your comfort level, interests and how busy each zone is |
| **Plan** | The quietest time for a day and workout type, with what-ifs ("what if it's finals week and raining?"); save it as a lift and invite friends |
| **Saved** | Your upcoming lifts with who's coming, and invitations from friends to accept or decline |
| **Friends** | Who's at UREC right now and where, check-ins, friend requests, and invites to lifts |

It runs in the browser, on desktop and phone, and as a phone app through **Expo Go** (`mobile/`).

## How it works

```
Simulator (sim/) → 4 years of hourly data → Forecaster (ml/, LightGBM) ─┐
Your question → Language layer (llm/, gemma3:4b via Ollama) → what-ifs ──┤
                                                                          ▼
              Backend (backend/, FastAPI) ◄──► PostgreSQL (friends, check-ins, lifts)
                                                                          ▼
                      Web app (src/, React) · 3D map (public/urec-3d.html) · Expo Go (mobile/)
```

- **Synthetic data:** a simulator built from JMU's academic calendar and UREC's floor plans produces about 434,000 hourly
  readings across 25 zones.
- **Forecaster:** LightGBM, off by **7.1 points** of capacity on a school year it never saw (simple baselines: 12–13).
  With every finals week hidden from training, it still forecasts finals to within 7.9 points (baseline: 15.1).
- **Language layer:** a local model (gemma3:4b) turns questions into labels; rules handle dates and times. Every number
  comes from the forecaster, so the AI can't make figures up. Without Ollama, keyword rules answer instead.
- **Backend:** FastAPI serves forecasts, answers questions and stores friends, check-ins and lifts in PostgreSQL. If it's
  off, the web app falls back to built-in mock data.

## Run it locally

You'll need Node, Python 3.12, and Docker Desktop. [Ollama](https://ollama.com) is optional: it powers the AI in the
question box, and without it the keyword rules answer.

```bash
npm install
pip install -r sim/requirements.txt -r ml/requirements.txt -r llm/requirements.txt -r backend/requirements.txt

python -m sim.generate                              # synthetic data, about 20 s (not in git)
python -m ml.train                                  # the forecaster, about 15 s (not in git)
docker compose up -d                                # PostgreSQL with the test users
ollama pull gemma3:4b                               # optional, once

python -m uvicorn backend.main:app --port 8000      # backend
npm run dev                                         # web app, in a second terminal: http://localhost:5173
```

**Test users:** `nathan`, `ryan`, `carter`, `maya`. There's no real login yet; switch users on the Friends page.

**On a phone:** `cd mobile`, `npm install`, `npx expo start`, then scan the QR code with Expo Go (same Wi-Fi as your computer).

## Repo layout

| Folder | What's in it | Details |
|---|---|---|
| `src/` | The web app (React, TypeScript, Vite, Tailwind, Recharts, Framer Motion) | |
| `public/urec-3d.html` | The 3D map (three.js) | |
| `backend/` | FastAPI server, database schema and seed data | [backend/README.md](backend/README.md) |
| `llm/` | Question parser, reply templates, test questions and scoring | [llm/README.md](llm/README.md) |
| `ml/` | Forecaster: training, the held-out finals test, predictions | [ml/README.md](ml/README.md) |
| `sim/` | Synthetic data: calendar, daily conditions, simulator, calibration | [sim/README.md](sim/README.md) |
| `shared/` | Zones, scenario settings and presets shared by every part | |
| `reports/` | Charts and scores | |
| `mobile/` | The Expo Go app | |
| `docker-compose.yml` | The PostgreSQL database | |

**More:** [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) covers the pitch, demo script, numbers, honest limitations and
who built what. The hosted version lives on the `vercel-deploy` branch, which has its own `DEPLOY.md`.

## Branches

- **`main`:** the tested product.
- **`map-config`:** day-to-day development. Merge into `main` once changes are tested.
- **`vercel-deploy`:** `main` set up for the free Vercel hosting at urec-radar.vercel.app (Ollama off).
