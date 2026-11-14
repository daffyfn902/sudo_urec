"""Data loading, splits, baselines, models and metrics shared by train.py and finals_test.py."""

from __future__ import annotations

import lightgbm as lgb
import numpy as np
import pandas as pd

from .features import CATEGORICAL, ROOT, make_features, traffic_status

DATA = ROOT / "data" / "synthetic" / "urec_hourly.parquet"
TRAIN_YEARS = ["2023-24", "2024-25"]
VAL_YEAR = "2025-26"
LIVE_YEAR = "2026-27"        # never trained or evaluated on: the API's "live" year

LGB_PARAMS = dict(n_estimators=700, learning_rate=0.05, num_leaves=63, min_child_samples=40,
                  subsample=0.8, subsample_freq=1, colsample_bytree=0.9, verbose=-1, random_state=0)


def load_open() -> pd.DataFrame:
    """All open-hour rows (closed hours are always 0 and aren't modelled)."""
    if not DATA.exists():
        raise SystemExit(f"{DATA} not found: run `python -m sim.generate` first")
    df = pd.read_parquet(DATA)
    return df[df["is_open"]].reset_index(drop=True)


def fit_lgb(train: pd.DataFrame, linear_tree: bool = False) -> lgb.LGBMRegressor:
    params = {**LGB_PARAMS, **({"linear_tree": True, "linear_lambda": 1.0} if linear_tree else {})}
    model = lgb.LGBMRegressor(**params)
    model.fit(make_features(train), train["occupancy_pct"], categorical_feature=CATEGORICAL)
    return model


def predict_lgb(model: lgb.LGBMRegressor, df: pd.DataFrame) -> np.ndarray:
    return np.clip(model.predict(make_features(df)), 0, 100)


def hist_mean_baseline(train: pd.DataFrame, test: pd.DataFrame) -> np.ndarray:
    """Average occupancy for the same zone, weekday and hour in the training data."""
    keys = ["zone_id", "dow", "hour"]
    means = train.groupby(keys, observed=True)["occupancy_pct"].mean().rename("pred").reset_index()
    out = test[keys].astype({"zone_id": str}).merge(means.astype({"zone_id": str}), on=keys, how="left")
    return out["pred"].fillna(train["occupancy_pct"].mean()).to_numpy()


def last_week_baseline(full: pd.DataFrame, test: pd.DataFrame, fallback: np.ndarray) -> np.ndarray:
    """Occupancy at the same zone and hour 7 days earlier (falls back when that day wasn't open)."""
    prev = full[["timestamp", "zone_id", "occupancy_pct"]].copy()
    prev["timestamp"] = prev["timestamp"] + pd.Timedelta(days=7)
    prev["zone_id"] = prev["zone_id"].astype(str)
    t = test[["timestamp", "zone_id"]].astype({"zone_id": str})
    out = t.merge(prev, on=["timestamp", "zone_id"], how="left")["occupancy_pct"].to_numpy()
    return np.where(np.isnan(out), fallback, out)


def md_table(df: pd.DataFrame) -> str:
    """Markdown table without the optional tabulate dependency."""
    cols = [df.index.name or ""] + [str(c) for c in df.columns]
    lines = ["| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)]
    lines += ["| " + " | ".join([str(i)] + [str(v) for v in row]) + " |" for i, row in zip(df.index, df.to_numpy())]
    return "\n".join(lines)


def score(y: np.ndarray, pred: np.ndarray) -> dict:
    y, pred = np.asarray(y, float), np.asarray(pred, float)
    return {
        "mae_pp": round(float(np.mean(np.abs(y - pred))), 2),
        "bias_pp": round(float(np.mean(pred - y)), 2),
        "status_acc": round(float(np.mean(traffic_status(y) == traffic_status(pred))), 3),
    }
