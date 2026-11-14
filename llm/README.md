# Scenario / language layer (Person 3)

Turns what someone types into a structured request, then into a reply built from real forecasts.

```bash
pip install -r llm/requirements.txt          # plus ml/requirements.txt; needs the trained model (python -m ml.train)
ollama pull gemma3:4b                         # or any model; set OLLAMA_MODEL to switch
python -m llm.ask "I'm new and nervous, when's the quietest time to try the weight room this week?"
python -m llm.evaluate --models gemma3:4b     # score parsers -> reports/llm_eval.md
```

## How it works

```
text ──► Ollama (labels only, JSON-constrained) ─┐
     └─► keyword rules (explicit dates/times) ───┴─► merge ─► resolve() ─► Request ─► answer() ─► reply + slots
```

1. **The LLM picks labels and never writes numbers or dates**: `intent` (best_time / how_busy / overview / unknown),
   `when` (today, tomorrow, this_week, next_week, this_weekend, finals_week, weekday, date), `time` (now, morning,
   evening, custom hours…), `area`, `zone`, and what-ifs (`scenario_week`, `weather`, `event`). Ollama's `format` makes
   it impossible to return anything outside the schema (`llm/schema.py`).
2. **Rules handle anything stated outright**: a weekday, "tonight", "at 6", "after my 3pm class", "Dec 9", a room
   name. Those override the LLM, which tends to get dates and times wrong (`merge()` in `llm/parse.py`).
3. **`resolve()` turns labels into concrete dates and hours**, using today's date and the JMU calendar.
   "During finals" uses the real finals dates; "what if it's finals" keeps today's date and overrides the knobs.
4. **Fallbacks**: if Ollama is down, slow or returns junk, the keyword rules run alone. If they recognise nothing, the
   question is treated as off-topic. `parse_request()` never raises.
5. **`answer()`** builds each day's knobs (the calendar's week type, then the what-ifs on top), runs `predict_day()` and
   fills templates. Every number in the reply comes from the forecaster.

## Results (`reports/llm_eval.md`)

| parser | dev (26, used while tuning) | **holdout (18, written after tuning)** | time |
|---|---|---|---|
| keywords only | 26/26 | 12/18 | instant |
| **gemma3:4b + rules** | 26/26 | **15/18** | about 4.7 s |

The dev scores are optimistic because the rules were tuned on those questions. The holdout is the honest number,
though one gym-word fix ("busiest") was prompted by a holdout miss. Remaining holdout misses:

- "around 8 tmrw morning" becomes 8 PM: the rule assumes bare hours 1-9 are PM and ignores the word "morning"
- "thanksgiving week": there's no label for break dates yet
- "can you book me a court" is treated as a crowd question instead of off-topic

## For the API (Person 4)

```python
from llm.parse import parse_request, warm_up
from llm.answer import answer

warm_up()                                  # at startup: the first model load takes 1-2 minutes
out = answer(parse_request(text))          # {"text", "understood", "slots": [{date, hour, pct}], "request"}
```

`out["understood"]` is the "here's what I understood" line, `out["slots"]` is the hourly data for charts and
the 3D map, and `out["request"]["source"]` is `llm`, `keyword` or `default`.

## Known limits

- About 4.7 s per question on an RTX 4050 with gemma3:4b. `qwen2.5:3b` may be faster: pull it and run
  `python -m llm.evaluate --models gemma3:4b qwen2.5:3b`.
- Regular days all use the same preset knobs, so every regular Monday forecasts the same. The backend should build
  real-date knobs the way the simulator does (semester stress ramp, actual weather).
- `sim.academic_calendar` is imported for the public calendar only; it could move to `shared/`.
