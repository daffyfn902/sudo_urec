"""Sanity checks for the synthetic dataset: prints key stats and saves reports/sim_check.png.

    python -m sim.check
"""

from __future__ import annotations

from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
WEEK_ORDER = ["first_week", "regular", "midterms", "finals", "post_new_year",
              "thanksgiving_break", "winter_break", "spring_break"]


def main() -> None:
    df = pd.read_parquet(ROOT / "data" / "synthetic" / "urec_hourly.parquet")
    daily = pd.read_csv(ROOT / "data" / "synthetic" / "daily_knobs.csv", parse_dates=["date"])
    open_ = df[df["is_open"]]

    # --- hard invariants ---------------------------------------------------------------
    assert not df.isna().any().any(), "NaNs in data"
    assert (df["headcount"] <= df["capacity"]).all(), "headcount above capacity"
    assert (df.loc[~df["is_open"], "headcount"] == 0).all(), "people in a closed zone"
    print("invariants ok: no NaNs, headcount <= capacity, closed zones empty\n")

    # --- behaviour checks ------------------------------------------------------------------
    by_week = open_.groupby("week_type", observed=True)["occupancy_pct"].mean().reindex(WEEK_ORDER)
    print("mean occupancy % (open hours) by week type:\n" + by_week.round(1).to_string() + "\n")

    fit = open_[(open_["zone_id"] == "L2_fitness") & (open_["dow"] < 5)]
    peak = fit.groupby(["week_type", "hour"], observed=True)["occupancy_pct"].mean().groupby(level=0).idxmax()
    print("Fitness Center weekday peak hour:\n" +
          peak.map(lambda t: t[1]).reindex(WEEK_ORDER).dropna().astype(int).to_string() + "\n")

    trk = open_[open_["category"] == "track"].groupby("weather", observed=True)["occupancy_pct"].mean()
    print("track occupancy % by weather:\n" + trk.round(1).to_string() + "\n")

    eve_courts = open_[(open_["category"] == "courts") & (open_["hour"] >= 18) & (open_["dow"] <= 3)]
    has_event = (eve_courts["event_load"] > 0.5).map({True: "event_load > 0.5", False: "event_load <= 0.5"})
    print("weeknight 6-10pm courts occupancy %:\n" +
          eve_courts.groupby(has_event)["occupancy_pct"].mean().round(1).to_string() + "\n")

    print("max academic_stress outside finals:",
          daily.loc[daily["week_type"] != "finals", "academic_stress"].max(),
          "| finals range:", daily.loc[daily["week_type"] == "finals", "academic_stress"].agg(["min", "max"]).tolist())

    # --- chart -------------------------------------------------------------------------------
    fig, ax = plt.subplots(2, 2, figsize=(13, 8.5))
    for wt in ["regular", "first_week", "midterms", "finals", "winter_break"]:
        s = fit[fit["week_type"] == wt].groupby("hour")["occupancy_pct"].mean()
        ax[0, 0].plot(s.index, s.values, marker="o", ms=3, label=wt)
    ax[0, 0].set(title="Fitness Center, weekday average by hour", xlabel="hour", ylabel="occupancy %")
    ax[0, 0].legend(fontsize=8)

    yr = open_[open_["academic_year"] == "2025-26"]
    dmean = yr.groupby("date")["occupancy_pct"].mean()
    wt_by_day = yr.groupby("date")["week_type"].first()
    for wt in WEEK_ORDER:
        idx = wt_by_day[wt_by_day == wt].index
        ax[0, 1].scatter(pd.to_datetime(idx), dmean.loc[idx], s=8, label=wt)
    ax[0, 1].set(title="2025-26: daily mean occupancy (all open zones)", ylabel="occupancy %")
    ax[0, 1].legend(fontsize=7, ncol=2)
    ax[0, 1].tick_params(axis="x", rotation=30)

    d = daily[daily["academic_year"] == "2025-26"]
    for c in ["students_on_campus", "academic_stress", "novelty", "event_load"]:
        ax[1, 0].plot(d["date"], d[c], lw=1, label=c)
    ax[1, 0].set(title="2025-26: daily knob values", ylim=(-0.05, 1.05))
    ax[1, 0].legend(fontsize=8)
    ax[1, 0].tick_params(axis="x", rotation=30)

    wk = open_[(open_["date"] >= pd.Timestamp("2025-10-27").date()) & (open_["date"] <= pd.Timestamp("2025-11-02").date())]
    for z in ["L2_fitness", "L3_cardio_deck", "L2_mac1", "L1_main_pool", "L3_cycle"]:
        s = wk[wk["zone_id"] == z].set_index("timestamp")["occupancy_pct"]
        ax[1, 1].plot(s.index, s.values, lw=1, label=z)
    ax[1, 1].set(title="One regular week (Oct 27 - Nov 2, 2025), selected zones", ylabel="occupancy %")
    ax[1, 1].legend(fontsize=8)
    ax[1, 1].tick_params(axis="x", rotation=30)

    fig.tight_layout()
    out = ROOT / "reports" / "sim_check.png"
    out.parent.mkdir(exist_ok=True)
    fig.savefig(out, dpi=110)
    print(f"\nchart -> {out}")


if __name__ == "__main__":
    main()
