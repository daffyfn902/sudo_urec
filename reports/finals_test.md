# Held-out finals test

Trained on 2023-24, 2024-25 with all finals days removed (171,489 rows, max academic_stress 0.72). Tested on the 2025-26 finals (3,810 open zone-hours, academic_stress 0.95 to 1.00). The model never sees the week_type label.

|  | mae_pp | bias_pp | status_acc |
|---|---|---|---|
| hist_mean (no finals) | 15.16 | 10.66 | 0.729 |
| lightgbm (no finals) | 8.46 | -1.21 | 0.836 |
| lightgbm linear_tree (no finals) | 8.09 | -1.14 | 0.85 |
| lightgbm WITH finals (reference) | 6.22 | -2.19 | 0.877 |

![chart](finals_test.png)
