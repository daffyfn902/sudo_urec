"""JMU-style academic calendar: label every date of an academic year with a week type.

Dates follow rules that reproduce the 2025-26 JMU calendar (classes Aug 25, fall finals
Dec 8-12, spring classes Jan 12, spring break Mar 7-15, spring finals May 4-8). Other
years use the same rules, so they are approximate.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

WEEK_TYPES = (
    "regular", "first_week", "midterms", "finals",
    "thanksgiving_break", "winter_break", "post_new_year", "spring_break",
)


def _first_weekday_on_or_after(d: date, weekday: int) -> date:
    return d + timedelta(days=(weekday - d.weekday()) % 7)


def _nth_weekday(year: int, month: int, weekday: int, n: int) -> date:
    return _first_weekday_on_or_after(date(year, month, 1), weekday) + timedelta(weeks=n - 1)


@dataclass(frozen=True)
class Day:
    date: date
    week_type: str
    semester: str            # "fall" or "spring"
    semester_progress: float  # 0 at first class day, 1 at last finals day


@dataclass(frozen=True)
class AcademicYear:
    fall_year: int
    fall_start: date
    fall_finals: tuple[date, date]
    thanksgiving: tuple[date, date]
    spring_start: date
    spring_break: tuple[date, date]
    spring_finals: tuple[date, date]
    fall_midterms: tuple[date, date]
    spring_midterms: tuple[date, date]

    @classmethod
    def for_fall_year(cls, y: int) -> "AcademicYear":
        fall_start = _first_weekday_on_or_after(date(y, 8, 22), 0)        # Monday
        fall_finals_mon = fall_start + timedelta(weeks=15)
        thanks_thu = _nth_weekday(y, 11, 3, 4)                             # 4th Thursday
        spring_start = _nth_weekday(y + 1, 1, 0, 2)                        # 2nd Monday of Jan
        sb_mon = spring_start + timedelta(weeks=8)
        sp_finals_mon = spring_start + timedelta(weeks=16)
        return cls(
            fall_year=y,
            fall_start=fall_start,
            fall_finals=(fall_finals_mon, fall_finals_mon + timedelta(days=4)),
            thanksgiving=(thanks_thu - timedelta(days=5), thanks_thu + timedelta(days=3)),  # Sat..Sun
            spring_start=spring_start,
            spring_break=(sb_mon - timedelta(days=2), sb_mon + timedelta(days=6)),          # Sat..Sun
            spring_finals=(sp_finals_mon, sp_finals_mon + timedelta(days=4)),
            fall_midterms=(fall_start + timedelta(weeks=7), fall_start + timedelta(weeks=8, days=-1)),
            spring_midterms=(spring_start + timedelta(weeks=6), spring_start + timedelta(weeks=7, days=-1)),
        )

    def days(self) -> list[Day]:
        """Every date from the first fall class day to the last spring finals day."""
        out: list[Day] = []
        d = self.fall_start
        while d <= self.spring_finals[1]:
            out.append(self.label(d))
            d += timedelta(days=1)
        return out

    def label(self, d: date) -> Day:
        def within(r: tuple[date, date]) -> bool:
            return r[0] <= d <= r[1]

        if d <= self.fall_finals[1] + timedelta(days=1):
            semester, start, end = "fall", self.fall_start, self.fall_finals[1]
        else:
            semester, start, end = "spring", self.spring_start, self.spring_finals[1]
        progress = min(1.0, max(0.0, (d - start).days / (end - start).days))

        if self.fall_finals[1] < d < self.spring_start:
            wt = "winter_break"
        elif within(self.fall_finals) or within(self.spring_finals):
            wt = "finals"
        elif within(self.thanksgiving):
            wt = "thanksgiving_break"
        elif within(self.spring_break):
            wt = "spring_break"
        elif self.fall_start <= d < self.fall_start + timedelta(days=7):
            wt = "first_week"
        elif self.spring_start <= d < self.spring_start + timedelta(weeks=2):
            wt = "post_new_year"
        elif within(self.fall_midterms) or within(self.spring_midterms):
            wt = "midterms"
        else:
            wt = "regular"
        return Day(d, wt, semester, progress)


if __name__ == "__main__":
    ay = AcademicYear.for_fall_year(2025)
    for name, value in vars(ay).items():
        print(f"{name:16} {value}")
