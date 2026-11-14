"""Fit GYM_SHAPE so an average regular weekday matches TARGET_WEEKDAY_PCT.

    python -m sim.calibrate

The shape isn't the target itself because everything else in the simulator acts on top of it
(stress shifting visits later, novelty, weather, Friday evenings, zone quirks, the class/pool/cafe
schedules). So: simulate, compare, nudge each hour, repeat. Writes the fitted GYM_SHAPE back into
sim/simulator.py.
"""

from __future__ import annotations

import re
from pathlib import Path

import numpy as np

from . import simulator as S

YEARS = [2024, 2025]
ITERATIONS = 12
HOURS = list(range(6, 23))


def weekday_profile() -> np.ndarray:
    """Average regular weekday: % of open capacity in use, per hour 6..22."""
    df, _ = S.simulate(YEARS)
    d = df[(df["week_type"] == "regular") & (df["dow"] < 5) & df["is_open"]]
    g = d.groupby("hour")
    return (100 * g["headcount"].sum() / g["capacity"].sum()).reindex(HOURS).to_numpy()


def smooth(x: np.ndarray) -> np.ndarray:
    """[0.15, 0.7, 0.15] smoothing with the ends held, so neighbouring hours can't zig-zag."""
    y = x.copy()
    y[1:-1] = 0.15 * x[:-2] + 0.7 * x[1:-1] + 0.15 * x[2:]
    return y


def main() -> None:
    target = np.array(S.TARGET_WEEKDAY_PCT, float)
    shape = target / 100                                # start from the target itself
    best = (np.inf, shape, None)
    for i in range(ITERATIONS):
        S.POINT_CURVES["gym"][:] = shape.tolist()      # simulator reads this list in place
        actual = weekday_profile()
        err = actual - target
        score = np.abs(err).mean() + 0.5 * np.abs(err).max()
        print(f"iteration {i}: max error {np.abs(err).max():.1f} pp, mean {np.abs(err).mean():.1f} pp")
        if score < best[0]:
            best = (score, shape.copy(), actual)
        if np.abs(err).max() < 1.5:
            break
        ratio = smooth(target / np.maximum(actual, 0.5))
        shape = np.clip(smooth(shape * ratio ** 0.7), 0.01, 1.3)   # >1 allowed: zones are still capped at capacity

    _, shape, actual = best
    print("target :", target.round(0).astype(int).tolist())
    print("actual :", actual.round(0).astype(int).tolist())
    text = ", ".join(f"{v:.3f}" for v in shape)
    path = Path(S.__file__)
    src = path.read_text(encoding="utf-8")
    src = re.sub(r"^GYM_SHAPE = \[.*\]$", f"GYM_SHAPE = [{text}]", src, count=1, flags=re.M)
    path.write_text(src, encoding="utf-8", newline="")
    print(f"wrote GYM_SHAPE to {path}")


if __name__ == "__main__":
    main()
