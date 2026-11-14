# Synthetic UREC data (Person 1)

```bash
pip install -r sim/requirements.txt
python -m sim.generate     # about 20 s -> data/synthetic/urec_hourly.parquet + daily_knobs.csv
python -m sim.check        # invariants, behaviour stats, reports/sim_check.png
```

Same seed gives the same data. `data/synthetic/` is gitignored, so regenerate it locally.
`data/sample/urec_sample.csv` (one regular week plus fall 2025 finals) is committed so the
forecaster and API can start before running the simulator.

## Inputs (shared contracts)

- `shared/zones.json`: the 25 live zones from the 3D map, with capacity, category and open hours
- `shared/knobs.schema.json`: `week_type` plus 5 knobs (`students_on_campus`, `academic_stress`, `novelty`, `weather`, `event_load`)
- `shared/presets.json`: default knobs for the 8 week types

## Output: `urec_hourly.parquet`

One row per zone per hour, 6:00 to 22:00, from the first fall class day to the end of spring finals,
for academic years 2023-24 through 2026-27 (about 434k rows).

| column | notes |
|---|---|
| `timestamp`, `date`, `hour`, `dow` | `dow` 0 = Monday |
| `zone_id`, `floor`, `category`, `capacity` | from `zones.json` |
| `is_open` | closed hours are kept with headcount 0 |
| `headcount`, `occupancy_pct` | **targets** |
| `week_type`, `semester`, `academic_year` | labels: don't feed `week_type` to the model for the finals test |
| `students_on_campus`, `academic_stress`, `novelty`, `weather`, `event_load` | the knobs: **features** |

## For the forecaster

- Suggested split: train 2023-24 and 2024-25, validate 2025-26, and treat 2026-27 as the "live" year the API serves.
- Held-out finals test: drop `week_type == "finals"` rows from training and test on them.
- `academic_stress` reaches at most about 0.73 outside finals, while finals are 0.94 to 1.0. Tree models
  can't extrapolate past 0.73, which is part of what the test shows.
- Everything in `sim/simulator.py` (curves, zone quirks, knob effects, noise) is hidden ground
  truth. The forecaster must not import it.

## What the hidden rules do

- Busiest to quietest: first week, then post New Year, regular, midterms, finals, breaks.
- Higher stress pushes peaks later (the Fitness Center peaks around 7 PM normally, 9 PM in finals).
- Students leave during finals week, so it empties out by Friday.
- Rain and snow move people onto the tracks; hot days fill the pools.
- Evening intramurals pack the courts.
- Classes run in fixed time slots; capacities and hours are estimates.
