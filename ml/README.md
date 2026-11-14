# Forecaster (Person 2)

```bash
pip install -r ml/requirements.txt
python -m sim.generate          # data first (about 20 s)
python -m ml.train              # baselines vs LightGBM on 2025-26, saves models/forecaster.joblib (about 15 s)
python -m ml.finals_test        # held-out finals test -> reports/finals_test.png (about 20 s)
python -m ml.predict 2026-12-07 finals
```

`models/forecaster.joblib` is gitignored (regenerate it with the commands above); `models/metadata.json` records what it was trained on and its validation scores.

## Design

- **Predicts** `occupancy_pct` per zone and hour for open hours; closed hours are always 0.
- **Inputs** (`ml/features.py`): hour, weekday, weekend flag, zone, category, floor, capacity, and the knobs
  (`students_on_campus`, `academic_stress`, `novelty`, `event_load`, `weather`). There are no lagged headcounts,
  so the model can answer what-ifs for any day. `week_type` is never an input.
- **Splits**: train 2023-24 + 2024-25, validate 2025-26. The saved model is refit on 2023-24 to 2025-26.
  2026-27 is the "live" year the API serves and is never trained on.
- `ml/features.py` reads only `shared/`; it must never import `sim.simulator` (hidden ground truth).

## Results on 2025-26 (`reports/forecast_eval.md`)

| | MAE (pp) | right low/moderate/high label |
|---|---|---|
| same zone/weekday/hour average | 11.4 | 78% |
| same hour last week | 12.0 | 78% |
| **LightGBM** | **6.7** | **87%** |

## Held-out finals test (`reports/finals_test.png`)

Trained with every finals day removed (max `academic_stress` 0.72), tested on 2025-26 finals (stress 0.95-1.0):

| | MAE (pp) | bias (pp) | right label |
|---|---|---|---|
| historical average | 15.2 | +10.7 | 73% |
| LightGBM | 8.5 | -1.2 | 84% |
| LightGBM `linear_tree` | 8.1 | -1.1 | 85% |
| LightGBM trained *with* finals (reference) | 6.2 | -2.2 | 88% |

The baseline assumes a normal week and guesses about 11 points too busy. LightGBM, with no finals examples, closes most of the
gap to the reference model. Where it still misses is the late-night finals rush (10 PM): stress above 0.72 never
appeared in training, and trees can't extrapolate past what they've seen.

## For the API

```python
from ml.predict import predict_day, preset_knobs, validate_knobs
df = predict_day(date(2026, 12, 7), preset_knobs("finals", weather="rain"))
# columns: zone_id, name, floor, category, capacity, hour, is_open, occupancy_pct, headcount, status
```

Load once at startup (first call about 3 s); after that, about 25 ms per day. `validate_knobs` clamps the numeric knobs
to 0-1 and rejects unknown weather, which suits `text_to_knobs` output too.
