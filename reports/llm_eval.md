# Request parser evaluation

Scored with today = 2026-11-13 at 15:00 (see llm/eval_cases.json). A question passes only if every checked field is right. **dev** was used while tuning, so it's optimistic; **holdout** was written afterwards and run untuned: that's the honest number.

| parser | passed | accuracy | avg time per question |
|---|---|---|---|
| keywords only [dev] | 26/26 | 100% | 0.00 s |
| gemma3:4b [dev] | 26/26 | 100% | 4.67 s |
| keywords only [holdout] | 12/18 | 67% | 0.00 s |
| gemma3:4b [holdout] | 15/18 | 83% | 4.73 s |

## Misses: keywords only [dev]

none

## Misses: gemma3:4b [dev]

none

## Misses: keywords only [holdout]

- `yo is urec dead around 8 tmrw morning` [keyword]: hour_from=20 (want 8); hour_to=20 (want 8)
- `lap swim busy this saturday?` [keyword]: area='track' (want 'pool')
- `show me the whole thanksgiving week` [keyword]: start='2026-11-13' (want ['2026-11-21', '2026-11-23'])
- `can you book me a court` [keyword]: intent='best_time' (want 'unknown')
- `midterms are next week, how slammed will the fitness center be` [keyword]: overrides={} (want {'week_type': 'midterms'})
- `how many people are on the running track at 7pm friday` [keyword]: intent='best_time' (want 'how_busy')

## Misses: gemma3:4b [holdout]

- `yo is urec dead around 8 tmrw morning` [llm]: hour_from=20 (want 8); hour_to=20 (want 8)
- `show me the whole thanksgiving week` [llm]: start='2026-11-13' (want ['2026-11-21', '2026-11-23'])
- `can you book me a court` [llm]: intent='best_time' (want 'unknown')
