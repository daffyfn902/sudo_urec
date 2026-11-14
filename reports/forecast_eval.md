# Forecaster evaluation

Trained on 2023-24, 2024-25; scored on 2025-26 (90,789 open zone-hours). MAE and bias are in percentage points of capacity; status_acc is how often the low/moderate/high label matches.

- **hist_mean**: average for the same zone, weekday and hour in training
- **last_week**: actual value 7 days earlier (uses recent data the model doesn't get)
- **lightgbm**: calendar + zone + knobs only

|  | mae_pp | bias_pp | status_acc |
|---|---|---|---|
| hist_mean | 11.41 | 0.27 | 0.775 |
| last_week | 11.97 | 0.2 | 0.781 |
| lightgbm | 6.69 | 0.02 | 0.874 |

## MAE by week type

| week_type | hist_mean | last_week | lightgbm |
|---|---|---|---|
| finals | 14.44 | 12.68 | 6.22 |
| first_week | 15.25 | 15.25 | 8.56 |
| midterms | 8.31 | 12.39 | 7.03 |
| post_new_year | 12.46 | 21.38 | 8.02 |
| regular | 9.26 | 11.47 | 7.38 |
| spring_break | 16.8 | 16.45 | 3.73 |
| thanksgiving_break | 17.15 | 15.62 | 3.75 |
| winter_break | 19.13 | 6.72 | 3.5 |
