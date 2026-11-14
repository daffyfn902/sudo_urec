"""Held-out finals test: can the forecaster handle finals week if it never saw one?

    python -m ml.finals_test

Train on 2023-24 + 2024-25 with every finals day removed, then test on the 2025-26 finals
(Dec and May). The model only gets the numeric knobs, never the week_type label, so finals
show up as an unseen mix of conditions: academic_stress around 1.0 (training tops out near 0.73)
with students leaving campus. A "with finals" model trained on the same years including finals
shows what's achievable.

Writes reports/finals_test.png and reports/finals_test.md.
"""

from __future__ import annotations

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

from .common import TRAIN_YEARS, VAL_YEAR, fit_lgb, hist_mean_baseline, load_open, md_table, predict_lgb, score
from .features import ROOT

REPORTS = ROOT / "reports"
SHOW_ZONE, SHOW_NAME = "L2_fitness", "Fitness Center"


def main() -> None:
    df = load_open()
    train_all = df[df["academic_year"].isin(TRAIN_YEARS)]
    train = train_all[train_all["week_type"] != "finals"]
    test = df[(df["academic_year"] == VAL_YEAR) & (df["week_type"] == "finals")].reset_index(drop=True)
    print(f"train {len(train):,} rows (no finals; max academic_stress {train['academic_stress'].max():.2f}) | "
          f"test {len(test):,} finals rows (academic_stress {test['academic_stress'].min():.2f}-"
          f"{test['academic_stress'].max():.2f})")

    preds = {
        "hist_mean (no finals)": hist_mean_baseline(train, test),
        "lightgbm (no finals)": predict_lgb(fit_lgb(train), test),
        "lightgbm linear_tree (no finals)": predict_lgb(fit_lgb(train, linear_tree=True), test),
        "lightgbm WITH finals (reference)": predict_lgb(fit_lgb(train_all), test),
    }
    table = pd.DataFrame({k: score(test["occupancy_pct"], p) for k, p in preds.items()}).T
    print("\n" + table.to_string())

    # --- chart ------------------------------------------------------------------------------
    colors = {"actual": "#111827", "hist_mean (no finals)": "#9ca3af", "lightgbm (no finals)": "#2563eb",
              "lightgbm linear_tree (no finals)": "#16a34a", "lightgbm WITH finals (reference)": "#f59e0b"}
    fig = plt.figure(figsize=(14, 8.5))
    gs = fig.add_gridspec(2, 2, height_ratios=[1.1, 1])

    ax = fig.add_subplot(gs[0, :])
    dec = test[(test["zone_id"] == SHOW_ZONE) & (test["timestamp"].dt.month == 12)].index
    x = range(len(dec))
    ax.plot(x, test.loc[dec, "occupancy_pct"], color=colors["actual"], lw=2.2, label="actual")
    for k, p in preds.items():
        ax.plot(x, p[dec], color=colors[k], lw=1.4, ls="--" if "reference" in k else "-", label=k)
    days = test.loc[dec, "date"].to_numpy()
    starts = [i for i in x if i == 0 or days[i] != days[i - 1]]
    ax.set_xticks(starts, [pd.Timestamp(days[i]).strftime("%a %b %d") for i in starts])
    for s in starts[1:]:
        ax.axvline(s - 0.5, color="#e5e7eb", lw=1, zorder=0)
    ax.set(title=f"{SHOW_NAME} through fall 2025 finals week (hourly, 6 AM to 10 PM each day)", ylabel="occupancy %")
    ax.legend(fontsize=8, ncol=3, loc="upper right")

    ax = fig.add_subplot(gs[1, 0])
    by_hour = test.assign(**{k: v for k, v in preds.items()}).groupby("hour")
    ax.plot(by_hour["occupancy_pct"].mean(), color=colors["actual"], lw=2.2, label="actual")
    for k in preds:
        ax.plot(by_hour[k].mean(), color=colors[k], lw=1.4, ls="--" if "reference" in k else "-", label=k)
    ax.set(title="All zones, 2025-26 finals: average by hour", xlabel="hour", ylabel="occupancy %")

    ax = fig.add_subplot(gs[1, 1])
    names = list(preds)
    ax.barh(range(len(names)), table["mae_pp"], color=[colors[n] for n in names])
    for i, (m, a) in enumerate(zip(table["mae_pp"], table["status_acc"])):
        ax.text(m + 0.2, i, f"{m:.1f} pp  ·  {a:.0%} right label", va="center", fontsize=9)
    ax.set_yticks(range(len(names)), names, fontsize=9)
    ax.invert_yaxis()
    ax.set(title="Error on held-out finals (lower is better)", xlabel="mean absolute error, percentage points",
           xlim=(0, table["mae_pp"].max() * 1.6))

    fig.tight_layout()
    REPORTS.mkdir(exist_ok=True)
    fig.savefig(REPORTS / "finals_test.png", dpi=110)

    (REPORTS / "finals_test.md").write_text(
        "# Held-out finals test\n\n"
        f"Trained on {', '.join(TRAIN_YEARS)} with all finals days removed ({len(train):,} rows, "
        f"max academic_stress {train['academic_stress'].max():.2f}). Tested on the {VAL_YEAR} finals "
        f"({len(test):,} open zone-hours, academic_stress {test['academic_stress'].min():.2f} to "
        f"{test['academic_stress'].max():.2f}). The model never sees the week_type label.\n\n"
        f"{md_table(table)}\n\n![chart](finals_test.png)\n", encoding="utf-8")
    print(f"\nchart -> {REPORTS / 'finals_test.png'}")


if __name__ == "__main__":
    main()
