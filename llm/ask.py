"""Ask a question end to end from the command line.

    python -m llm.ask "when's the best time to lift tomorrow?"
    python -m llm.ask "what if it's finals and raining" --today 2026-11-13 --hour 15
    python -m llm.ask "is the pool busy tonight" --no-llm      # keyword fallback only
"""

from __future__ import annotations

import argparse
import sys
import time
from datetime import date

from .answer import answer
from .parse import DEFAULT_MODEL, parse_request


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("question")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--no-llm", action="store_true")
    ap.add_argument("--today", type=date.fromisoformat)
    ap.add_argument("--hour", type=int)
    args = ap.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    t = time.perf_counter()
    req = parse_request(args.question, today=args.today, now_hour=args.hour, model=None if args.no_llm else args.model)
    parsed = time.perf_counter() - t
    out = answer(req)
    print(f"[{req.source}{' ' + req.model if req.model else ''}, parsed in {parsed:.1f}s"
          + (f", rules fixed: {', '.join(req.rule_fixes)}" if req.rule_fixes else "") + "]")
    if out["understood"]:
        print(f"Understood: {out['understood']}\n")
    print(out["text"])


if __name__ == "__main__":
    main()
