# Deploying UREC Radar on Vercel (free)

This branch (`vercel-deploy`) is `main` set up to run entirely on Vercel's free Hobby plan:

| Part | On Vercel |
|---|---|
| Web app (React) | Static build, served by Vercel |
| Backend (FastAPI) | A Python function on Vercel, in the same project ([Vercel Services](https://vercel.com/docs/services), `vercel.json`) |
| Database | **Neon Postgres**, free, added from Vercel's Storage tab |
| Language model (Ollama) | **Switched off.** Questions are answered by the keyword rules (12/18 on our test set vs 15/18 with gemma). |

## What's different from `main`

- **No Ollama:** `OLLAMA_MODEL` defaults to `off` on this branch (`llm/parse.py`). Set it to `gemma3:4b` locally to turn it back on.
- **No LightGBM on the server:** the forecaster runs as exported decision trees with numpy (`ml/trees.py`,
  `models/forecaster_trees.npz`). The predictions match LightGBM to within 1e-12, and the server stays small
  (about 175 MB of libraries).
- **Live readings** come from `data/live/readings_2026-27.csv.gz` (the full dataset isn't in git).
- **Eastern time on the server:** "today" and "right now" use `clock.py` (America/New_York), since Vercel runs in UTC.
- **The database sets itself up:** on first use, the backend creates the tables and seeds the test users.
- Server dependencies are the slim root `requirements.txt`.

## Deploy (about 10 minutes, all in the browser)

1. **Create a free Vercel account** at [vercel.com](https://vercel.com), signing up with GitHub (Hobby plan).
2. **Import the repo:** *Add New → Project*, pick `daffyfn902/sudo_urec`, then *Deploy*. Leave the framework
   settings alone; `vercel.json` defines both parts.
3. **Deploy this branch:** in the project, *Settings → Git → Production Branch*, set `vercel-deploy`, then
   *Deployments → Redeploy*. (Or keep `main` as production and open this branch's preview deployment.)
4. **Add the database:** *Storage → Create Database → Neon (Postgres)*, free plan, and connect it to the
   project. This sets `DATABASE_URL`. *Redeploy* once so the backend picks it up.
5. **Check it:** open `https://<your-project>.vercel.app/api/health`. You want `"database": "up"` and
   `"ollama": "disabled"`. Then open the site itself.

## Updating it

- **Code changes:** push to `vercel-deploy` and Vercel redeploys automatically.
- **After retraining the model** (`python -m ml.train` also exports `models/forecaster_trees.npz`) or regenerating data:

  ```bash
  python -c "from backend.core import export_live_readings as e; e()"
  ```

  Then commit `models/forecaster_trees.npz` and `data/live/readings_2026-27.csv.gz`.

## Test the hosted setup locally first

```bash
python -m venv .venv-deploy && .venv-deploy/Scripts/pip install -r requirements.txt uvicorn
.venv-deploy/Scripts/python -m uvicorn backend.main:app --port 8000   # slim server, no LightGBM / Ollama
npm run build && npx vite preview                                      # production web app on :4173
```

## Things to know

- **No login.** Anyone with the link can act as any test user (nathan, ryan, carter, maya) and change friends
  and lifts. Fine for a demo, not for real users.
- **Demo data ages.** Seeded check-ins ("Ryan is at UREC") expire 3 hours after the database is first set up, and
  Ryan's seeded lift is for the day after setup. To restore the demo story, run this from your laptop with the Neon
  connection string from *Storage → Neon → .env*:

  ```bash
  DATABASE_URL="postgresql://..." python -m backend.db reset
  ```

- **Cold starts.** The first request after a quiet spell takes a few seconds while the server starts.
- **Vercel Services is in beta.** If a build fails on size, add the environment variable `VERCEL_ANALYZE_BUILD_OUTPUT=1`
  and redeploy to see what's large.
- The Expo app (`mobile/`) points at your laptop, not the hosted site. To use the hosted site on a phone, just open
  its URL in the browser.
