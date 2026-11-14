"""Generate the synthetic UREC dataset.

    python -m sim.generate                         # default: fall years 2023-2026, seed 42
    python -m sim.generate --years 2025 --seed 1

Writes:
    data/synthetic/urec_hourly.parquet   one row per (zone, hour); the training table
    data/synthetic/daily_knobs.csv       one row per day: week type + knob values
    data/sample/urec_sample.csv          small slice (a regular week + fall 2025 finals) to commit
"""

from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path

from .simulator import simulate

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--years", type=int, nargs="+", default=[2023, 2024, 2025, 2026],
                    help="fall years of the academic years to simulate")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", type=Path, default=ROOT / "data" / "synthetic")
    args = ap.parse_args()

    hourly, daily = simulate(args.years, args.seed)
    args.out.mkdir(parents=True, exist_ok=True)
    hourly.to_parquet(args.out / "urec_hourly.parquet", index=False)
    daily.to_csv(args.out / "daily_knobs.csv", index=False)

    d = hourly["date"]
    sample = hourly[((d >= date(2025, 10, 27)) & (d <= date(2025, 11, 2))) |
                    ((d >= date(2025, 12, 8)) & (d <= date(2025, 12, 12)))]
    if len(sample):
        (ROOT / "data" / "sample").mkdir(parents=True, exist_ok=True)
        sample.to_csv(ROOT / "data" / "sample" / "urec_sample.csv", index=False)

    print(f"{len(hourly):,} hourly rows, {len(daily)} days, "
          f"{hourly['zone_id'].nunique()} zones -> {args.out}")


if __name__ == "__main__":
    main()
