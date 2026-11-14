"""Score parsers on llm/eval_cases.json.

    python -m llm.evaluate                          # keywords + every model in --models
    python -m llm.evaluate --models gemma3:4b qwen2.5:3b

A case passes only if every checked field matches. Writes reports/llm_eval.md.
"""

from __future__ import annotations

import argparse
import json
import time
from datetime import date
from pathlib import Path

from .parse import ollama_extract, parse_request, warm_up

ROOT = Path(__file__).resolve().parent.parent
CASES = json.loads((Path(__file__).parent / "eval_cases.json").read_text(encoding="utf-8"))


def check(req, expect: dict) -> list[str]:
    """Names of the fields that don't match."""
    got = req.model_dump(mode="json")
    wrong = []
    for k, want in expect.items():
        ok = got[k] in want if isinstance(want, list) else got[k] == want
        if not ok:
            wrong.append(f"{k}={got[k]!r} (want {want!r})")
    return wrong


def run(model: str | None, split: str) -> dict:
    today, now_hour = date.fromisoformat(CASES["today"]), CASES["now_hour"]
    name = f"{model or 'keywords only'} [{split}]"
    if model:
        warm_up(model)
        ollama_extract("warm up", today, now_hour, model, timeout=300)   # load the prompt once
    passed, times, fails, fallbacks = 0, [], [], 0
    for c in CASES[split]:
        t = time.perf_counter()
        req = parse_request(c["text"], today=today, now_hour=now_hour, model=model, timeout=60)
        times.append(time.perf_counter() - t)
        fallbacks += bool(model) and req.source != "llm"
        wrong = check(req, c["expect"])
        passed += not wrong
        if wrong:
            fails.append(f"- `{c['text']}` [{req.source}]: " + "; ".join(wrong))
    n = len(CASES[split])
    print(f"\n{name}: {passed}/{n} passed, avg {sum(times) / n:.2f}s per question"
          + (f", {fallbacks} fell back to keywords" if fallbacks else ""))
    print("\n".join(fails))
    return {"name": name, "passed": passed, "n": n, "avg_s": sum(times) / n, "fallbacks": fallbacks, "fails": fails}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", nargs="*", default=["gemma3:4b"])
    args = ap.parse_args()
    results = [run(m, split) for split in ("dev", "holdout") for m in [None, *args.models]]

    lines = ["# Request parser evaluation", "",
             f"Scored with today = {CASES['today']} at {CASES['now_hour']}:00 (see llm/eval_cases.json). "
             "A question passes only if every checked field is right. **dev** was used while tuning, so it's "
             "optimistic; **holdout** was written afterwards and run untuned: that's the honest number.", "",
             "| parser | passed | accuracy | avg time per question |", "|---|---|---|---|"]
    lines += [f"| {r['name']} | {r['passed']}/{r['n']} | {r['passed'] / r['n']:.0%} | {r['avg_s']:.2f} s |" for r in results]
    for r in results:
        lines += ["", f"## Misses: {r['name']}", ""] + (r["fails"] or ["none"])
    out = ROOT / "reports" / "llm_eval.md"
    out.parent.mkdir(exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nreport -> {out}")


if __name__ == "__main__":
    main()
