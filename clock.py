"""The app's notion of "now", in UREC's time zone.

Servers usually run in UTC, which would make "today" and "right now" wrong for JMU in the evening
(8 PM Eastern is already tomorrow in UTC). Everything that needs the current date or hour uses
these helpers instead of datetime.now() / date.today(). Override the zone with APP_TZ.
"""

from __future__ import annotations

import os
from datetime import date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

APP_TZ = os.environ.get("APP_TZ", "America/New_York")

try:
    _ZONE: ZoneInfo | None = ZoneInfo(APP_TZ)
except ZoneInfoNotFoundError:      # no time-zone database installed (pip install tzdata)
    _ZONE = None


def now() -> datetime:
    """Current wall-clock time in APP_TZ, without tzinfo (the rest of the code uses naive times)."""
    return datetime.now(_ZONE).replace(tzinfo=None) if _ZONE else datetime.now()


def today() -> date:
    return now().date()
