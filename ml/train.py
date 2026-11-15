"""Train and evaluate the forecaster, then save the model the API serves.

    python -m ml.train

1. Fit on 2023-24 + 2024-25, score on 2025-26 against two baselines.
2. Refit on 2023-24 through 2025-26 and save models/forecaster.joblib + models/metadata.json.
3. Write reports/forecast_eval.md.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

import joblib
import pandas as pd

from .common import (LGB_PARAMS, LIVE_YEAR, TRAIN_YEARS, VAL_YEAR, fit_lgb, hist_mean_baseline,
                     last_week_baseline, load_open, md_table, predict_lgb, score)
from .features import FEATURES, ROOT

MODELS = ROOT / "models"
REPORTS = ROOT / "reports"


def main() -> None:
    df = load_open()
    train = df[df["academic_year"].isin(TRAIN_YEARS)]
    val = df[df["academic_year"] == VAL_YEAR]
    print(f"train {len(train):,} rows ({', '.join(TRAIN_YEARS)}) | validate {len(val):,} rows ({VAL_YEAR})")

    preds = {"hist_mean": hist_mean_baseline(train, val)}
    preds["last_week"] = last_week_baseline(df, val, preds["hist_mean"])
    preds["lightgbm"] = predict_lgb(fit_lgb(train), val)

    overall = pd.DataFrame({k: score(val["occupancy_pct"], p) for k, p in preds.items()}).T
    by_week = pd.DataFrame({
        k: val.assign(err=(val["occupancy_pct"] - p).abs()).groupby("week_type", observed=True)["err"].mean()
        for k, p in preds.items()
    }).round(2)
    print("\n" + overall.to_string() + "\n\nMAE (percentage points) by week type:\n" + by_week.to_string())

    # final model: everything except the live year
    final_rows = df[df["academic_year"] != LIVE_YEAR]
    model = fit_lgb(final_rows)
    MODELS.mkdir(exist_ok=True)
    joblib.dump(model, MODELS / "forecaster.joblib")
    from .trees import export
    export()                                   # numpy copy used by the hosted demo (models/forecaster_trees.npz)
    meta = {
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "trained_on": sorted(final_rows["academic_year"].astype(str).unique().tolist()),
        "rows": len(final_rows), "target": "occupancy_pct (open hours; closed hours are 0)",
        "features": FEATURES, "params": LGB_PARAMS,
        "validation": {"year": VAL_YEAR, **overall.to_dict(orient="index")},
    }
    (MODELS / "metadata.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    REPORTS.mkdir(exist_ok=True)
    (REPORTS / "forecast_eval.md").write_text(
        f"# Forecaster evaluation\n\nTrained on {', '.join(TRAIN_YEARS)}; scored on {VAL_YEAR} "
        f"({len(val):,} open zone-hours). MAE and bias are in percentage points of capacity; "
        "status_acc is how often the low/moderate/high label matches.\n\n"
        "- **hist_mean**: average for the same zone, weekday and hour in training\n"
        "- **last_week**: actual value 7 days earlier (uses recent data the model doesn't get)\n"
        "- **lightgbm**: calendar + zone + knobs only\n\n"
        f"{md_table(overall)}\n\n## MAE by week type\n\n{md_table(by_week)}\n",
        encoding="utf-8")
    print(f"\nsaved {MODELS / 'forecaster.joblib'} (trained on {', '.join(meta['trained_on'])})")


if __name__ == "__main__":
    main()
