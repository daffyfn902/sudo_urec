# UREC Radar: team overview for the pitch

One page with everything that's been built, how it fits together, the numbers to quote, and how to run the demo.
Written from `main` on **Nov 14, 2026**. Each part has its own README with the details (linked below).

> **All crowd numbers are simulated.** There is no live UREC headcount feed. Say so up front; it's also our strongest
> answer to "how do you know it works?" (see [the finals test](#the-numbers-for-the-slides)).

---

## The pitch in one breath

**UREC Radar shows how busy every part of JMU's UREC is right now, forecasts the rest of the day, and finds you a
quieter time to go.** The angle (from our "Comfort Zone" idea): the gym is intimidating for new students, and a quiet
first visit makes it easier to come back. You can ask in plain English ("I'm new and kind of nervous, when's the quietest
time to try the weight room this week?"), see the building in 3D, and plan a lift with friends.

The line for judges: **"The AI interprets, the model predicts."** The language model only works out what you're asking;
every number on screen comes from the forecasting model, so the app can't make up figures.

---

## What's in the app

Six screens, in the sidebar on desktop and the bottom bar on phones:

| Screen | What it does |
|---|---|
| **Home** | "Right now": how full UREC is, how many people are inside, the busiest zones, today's hourly forecast. The **Ask about crowds** box answers plain-English questions. A card shows which friends are at UREC. |
| **Map** | A 3D model of all four floors, traced from UREC's floor plans. 25 zones are colored green / yellow / red from the forecast, with walking people, an exterior view, a time slider colored by busyness, and floor buttons. It opens at the current time. |
| **Explore** | 13 low-pressure "try something new" challenges, ranked by your interests, your comfort level, which zones you haven't tried yet and how busy each zone is now. |
| **Plan** | Pick a day and a workout type (any, weights, cardio, courts), optionally a **what-if** ("what if it's finals week and raining?"). Get the quietest window and the hourly chart, then **Save lift** and invite friends. |
| **Saved** | Invitations from friends (I'm in / Can't make it), your upcoming lifts with who's coming, and friends' lifts you've joined. |
| **Friends** | Who's at UREC right now and where, check yourself in, friend requests, and "Invite to a lift". |

It also runs on a phone through **Expo Go** (the `mobile/` app wraps the web app).

---

## How it works

```
 Simulator (sim/)  ──►  4 years of hourly headcounts  ──►  Forecaster (ml/, LightGBM)
                                                                  │
 "finals week and it's raining"                                   ▼
        │                                              predict_day(date, conditions)
        ▼                                                         │
 Language layer (llm/): gemma3:4b via Ollama  ──► conditions ─────┤
   picks labels only, never numbers                               ▼
                                                     Backend (backend/, FastAPI)  ◄──►  PostgreSQL (Docker)
                                                                  │                     friends, check-ins, lifts
                                                                  ▼
                                    Web app (src/, React)  +  3D map (public/urec-3d.html)  +  Expo Go (mobile/)
```

### 1. Synthetic data: [`sim/`](sim/README.md)
- **Why:** UREC doesn't publish live counts, so we built a realistic stand-in.
- **The building:** 25 real zones from the floor plans (Fitness Center, MAC 1-3, pools, tracks, class studios...),
  each with a capacity, category and opening hours (`shared/zones.json`). Capacities and hours are estimates.
- **The calendar:** every day is labelled with JMU's real academic calendar: first week, midterms, finals,
  Thanksgiving, winter and spring break, and regular weeks.
- **Each day's conditions ("knobs"):** students on campus, academic stress, new-semester energy, weather, and evening
  events like intramurals.
- **The output:** about 434,000 hourly rows across academic years 2023-24 to 2026-27.
- **The weekday pattern:** builds through the morning, **peaks 1-3 PM (about 60%)**, holds about 50% until 8 PM, then
  falls to 20% by 10 PM. A calibration script (`python -m sim.calibrate`) fits the simulator to that target within
  about 2 points.
- **What the rules produce:** finals push people later, rain fills the indoor tracks, breaks empty the building, and
  intramural nights pack the courts.

### 2. Forecaster: [`ml/`](ml/README.md)
- **The model:** LightGBM. Its inputs are the hour, weekday, zone and that day's conditions, and nothing else.
  - **No "busyness last week" input,** so it can answer what-ifs for days that never happened.
  - **Never told "this is finals",** so the finals test below is a fair test.
- **Training:** on 2023-24 and 2024-25, scored on 2025-26. 2026-27 plays the "live" year.

### 3. Language layer: [`llm/`](llm/README.md)
- **The model:** **gemma3:4b**, running locally through Ollama on the laptop GPU. It turns a question into labels:
  what you want (best time / how busy / overview), when, which area, and any what-ifs.
- **Hybrid design:** the LLM reads the *meaning*, while rules handle explicit dates and times ("Tuesday", "at 6",
  "after my 3pm class"), which small models get wrong. If Ollama is off, keyword rules answer on their own.
- **The reply:** a template filled with forecaster numbers. Best-time answers are spread out (one morning, midday
  and evening option, on different days).

### 4. Backend: [`backend/`](backend/README.md)
- **The server:** FastAPI, in the exact shapes the web app already expected, plus:
  - `/api/ask`: answers a plain-English question
  - `/api/scenario/interpret`: turns a typed what-if into a scenario
  - `/api/day`: all 25 zones for the 3D map
  - `/api/reading`: where a camera feed could plug in later
  - `/api/health`: live status of the model, Ollama and the database
- **"Right now"** uses the simulator's 2026-27 numbers as a stand-in sensor. Everything else is the model's forecast.
- **The fallback:** if the backend is off, the app falls back to built-in mock data, so it never breaks.

### 5. Friends, check-ins and lifts (PostgreSQL in Docker)
- **The tables:** users, friendships, check-ins ("I'm at UREC", lasting 3 hours), lifts and lift invites
  (`backend/schema.sql`).
- **Test users:** **nathan, ryan, carter, maya**, with a demo story already seeded:
  - Ryan is at Free Weights and has invited Nathan to a lift tomorrow.
  - Maya has sent Nathan a friend request.
- **Login:** none yet. A "Signed in as" switcher on the Friends page stands in for it.

---

## The numbers for the slides

| What | Number | Where it comes from |
|---|---|---|
| Forecast error, year it never saw | **7.1 points** (vs 12.2 for the best simple baseline) | `reports/forecast_eval.md` |
| Right busyness label (low / moderate / busy) | **85%** (vs 73-74%) | same |
| **Finals test:** trained with every finals week hidden | **7.9 points** error | `reports/finals_test.png` |
| Finals test: the simple baseline | 15.1 points (guesses about 13 too busy) | same |
| Finals test: a model that *did* see finals (best case) | 6.2 points | same |
| Question understanding, on 18 unseen questions | **15/18** with gemma + rules, vs 12/18 keywords alone | `reports/llm_eval.md` |
| Question speed | about 5-8 seconds (gemma3:4b on an RTX 4050 laptop GPU) | measured in the app |
| Synthetic data | about 434,000 hourly rows, 25 zones, 4 academic years | `sim/` |

**The finals story (the strongest slide):** we hid every finals week from training. The simple baseline assumed a
normal week and guessed 13 points too busy. Our model, which had never seen finals, got within 1.7 points of a model
that had. The chart in `reports/finals_test.png` shows it.

---

## The demo (about 4 minutes)

**Before you present** (10 minutes ahead):
- Docker Desktop is running, and `docker compose ps` shows `comfort-zone-db` as healthy.
- `python -m backend.db reset` restores the demo story (Ryan's invite, Maya's request, who's checked in).
- The backend is running, and `ollama ps` shows **gemma3:4b … Forever**. If not, restart the backend, which loads it.
- Ask one question once, to warm it up.
- **On a phone:** same Wi-Fi as the laptop. Campus Wi-Fi may block it; use a phone hotspot.

**The flow:**
1. **Home.** "It's busy right now, here's the rest of the day." Then type the nervous-first-timer question into
   **Ask about crowds**. Point at the **Understood** line and the **Read by AI** tag.
2. **Plan.** Type *"what if it's finals week and raining"*. The recommended window and chart shift later in the day.
   Pick Ryan, **Save lift**.
3. **Map.** The building is colored by the forecast. Drag the time slider through the day and watch it change.
   Switch floors, show the exterior.
4. **Friends.** Ryan is at Free Weights. Switch "Signed in as" to Ryan, open **Saved**, and accept Nathan's invite.
5. **Back to slides:** the finals chart and the numbers above.

**Questions that work well live:**
- "I'm new and kind of nervous, when's the quietest time to try the weight room this week?"
- "is the pool packed tonight"
- "what if it's finals week and raining"
- "show me next week" (Thanksgiving break shows up as nearly empty)

**If something fails on stage:** if Ollama is slow or down, answers still come back through the keyword rules
(tagged "Keyword match"). If the backend is down, the app shows mock data instead of breaking.

---

## Honest answers for judges

- **"Is this real data?"** No, it's simulated, built from JMU's academic calendar, UREC's floor plans and typical gym
  patterns. The point of the finals test is to show the model learns patterns it can apply to weeks it never saw,
  which is what real data would need too. The plug-in point for real counts (a camera or door counter) already exists:
  `POST /api/reading`.
- **"Why a local AI model?"** It's free, private (questions never leave the laptop) and works offline. It only picks
  labels, so a small model is enough, and we measured it: 15/18 on unseen questions.
- **"Can the AI make things up?"** No. It never writes numbers or replies; it only fills in a form. All figures come from
  the forecaster, and the replies are templates.
- **"Privacy for the friends feature?"** Check-ins are opt-in and expire after 3 hours. There's no real login yet; that's
  the first thing to add before any real use.

## Known limitations

- Simulated data only. Capacities, hours and the daily pattern are estimates.
- No real login, and each person's database is their own (not shared between laptops).
- Every regular weekday uses the same conditions, so regular Mondays forecast the same.
- "Quietest time" for a class studio can mean no class is running.
- The map's color gradient and its Low / Moderate / High labels use slightly different cut-offs.
- The 6 summary zones on Home and Plan are averages of the 25 real zones; Free Weights and Upstairs Strength both map
  to the Fitness Center, so they show the same number.

---

## Run it yourself

You'll need: Node, Python 3.12, Docker Desktop, and [Ollama](https://ollama.com) with `gemma3:4b` (optional: without it
the app uses the keyword rules).

```bash
npm install
pip install -r sim/requirements.txt -r ml/requirements.txt -r llm/requirements.txt -r backend/requirements.txt
python -m sim.generate          # about 20 s: the synthetic data (not in git)
python -m ml.train              # about 15 s: the forecaster (not in git)
docker compose up -d            # the database, with test users
ollama pull gemma3:4b           # once
python -m uvicorn backend.main:app --port 8000
npm run dev                     # in another terminal, then open http://localhost:5173
```

**On a phone:** `cd mobile`, `npm install`, `npx expo start`, then scan the QR code with Expo Go.

---

## Where everything lives

| Folder | What's in it |
|---|---|
| `src/` | The web app (React, TypeScript, Tailwind) |
| `public/urec-3d.html` | The 3D map (three.js) |
| `backend/` | FastAPI server, database schema and seed data |
| `llm/` | Question parser, reply templates, test questions and scoring |
| `ml/` | Forecaster: features, training, finals test, `predict_day` |
| `sim/` | Synthetic data: calendar, daily conditions, simulator, calibration |
| `shared/` | Zone list, condition definitions and presets shared by every part |
| `reports/` | Charts and scores for the slides |
| `mobile/` | Expo Go app |
| `docker-compose.yml` | The PostgreSQL database |

## Who built what (from the git history)

- **Carter:** the original app (Home, Map, Plan, Saved on mock data), the map's color scheme, and the Explore
  challenges feature.
- **Ryan:** the 3D map's look (walking people with zone activities, a more realistic building, pan and rotate
  controls, the exterior view, the busyness-colored time slider), and the UI redesign (sidebar navigation, clearer
  Home and Plan, the UREC Radar name, "Right now" synced with the map).
- **Nathan:** the simulator, forecaster and finals test, the language layer and question box, the backend, connecting
  the app and 3D map to real forecasts, the Expo app, and friends, check-ins and lifts with the Docker database.

## Branches

- **`main`:** the tested product and GitHub's default. Demo from this.
- **`map-config`:** day-to-day development. Merge it into `main` once changes are tested. *(As of this writing it's
  behind `main` and needs `main` merged in before anyone works on it.)*
- **`windows-rotation`:** `main` with the earlier, simpler map controls (drag rotates, no panning).
- `map`, `try-something-new` and `ui` are older feature branches, already merged.
