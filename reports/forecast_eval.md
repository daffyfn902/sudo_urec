# Forecaster evaluation

Trained on 2023-24, 2024-25; scored on 2025-26 (90,789 open zone-hours). MAE and bias are in percentage points of capacity; status_acc is how often the low/moderate/high label matches.

- **hist_mean**: average for the same zone, weekday and hour in training
- **last_week**: actual value 7 days earlier (uses recent data the model doesn't get)
- **lightgbm**: calendar + zone + knobs only

|  | mae_pp | bias_pp | status_acc |
|---|---|---|---|
| hist_mean | 12.24 | 0.54 | 0.73 |
| last_week | 12.99 | 0.28 | 0.74 |
| lightgbm | 7.14 | 0.24 | 0.853 |

## MAE by week type

| week_type | hist_mean | last_week | lightgbm |
|---|---|---|---|
| finals | 14.4 | 14.32 | 6.16 |
| first_week | 17.3 | 17.3 | 9.14 |
| midterms | 8.3 | 13.0 | 7.41 |
| post_new_year | 13.63 | 22.13 | 8.93 |
| regular | 9.53 | 12.36 | 7.9 |
| spring_break | 19.61 | 17.04 | 4.08 |
| thanksgiving_break | 19.74 | 19.5 | 3.85 |
| winter_break | 22.23 | 7.55 | 3.63 |
