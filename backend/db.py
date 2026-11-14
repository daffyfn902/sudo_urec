"""Local PostgreSQL for the social features (users, friends, check-ins, lifts).

Runs a project-only Postgres cluster in data/postgres on port 5433, using the PostgreSQL
programs already installed on the machine. No admin rights, password or Windows service needed.

    python -m backend.db setup     # first time: create the cluster, start it, create tables, seed test users
    python -m backend.db start     # start it again later (e.g. after a reboot)
    python -m backend.db stop
    python -m backend.db reset     # wipe all social data and re-seed the test users
    python -m backend.db status

Point DATABASE_URL somewhere else to use a different server instead.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from contextlib import contextmanager
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

ROOT = Path(__file__).resolve().parent.parent
PGDATA = ROOT / "data" / "postgres"
PGLOG = ROOT / "data" / "postgres.log"
PORT = int(os.environ.get("PGPORT_COMFORT", "5433"))
DB_USER, DB_NAME = "comfort", "comfort_zone"
DATABASE_URL = os.environ.get("DATABASE_URL", f"postgresql://{DB_USER}@localhost:{PORT}/{DB_NAME}")
SCHEMA = Path(__file__).with_name("schema.sql")


class DatabaseUnavailable(RuntimeError):
    pass


@contextmanager
def connect():
    """One short-lived connection per request; commits on success, rolls back on error."""
    try:
        conn = psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=3)
    except psycopg.OperationalError as e:
        raise DatabaseUnavailable(str(e)) from e
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def is_up() -> bool:
    try:
        with connect() as c:
            c.execute("SELECT 1")
        return True
    except DatabaseUnavailable:
        return False


# --------------------------------------------------------------------------------------------
# Seed data: test users and a small story to demo with
# --------------------------------------------------------------------------------------------
SEED = """
INSERT INTO users (username, display_name, color) VALUES
  ('nathan', 'Nathan', '#450084'),
  ('ryan',   'Ryan',   '#16a66a'),
  ('carter', 'Carter', '#e07a2e'),
  ('maya',   'Maya',   '#2a78d6');

-- Nathan, Ryan and Carter are all friends with each other
INSERT INTO friendships (user_id, friend_id, status)
SELECT a.id, b.id, 'accepted' FROM users a, users b
WHERE a.username IN ('nathan', 'ryan', 'carter') AND b.username IN ('nathan', 'ryan', 'carter') AND a.id <> b.id;

-- Maya has sent Nathan a friend request
INSERT INTO friendships (user_id, friend_id, status)
SELECT m.id, n.id, 'pending' FROM users m, users n WHERE m.username = 'maya' AND n.username = 'nathan';

-- Ryan checked in at Free Weights 25 minutes ago; Maya is on the track
INSERT INTO checkins (user_id, zone_id, checked_in_at)
SELECT id, 'free-weights', now() - interval '25 minutes' FROM users WHERE username = 'ryan';
INSERT INTO checkins (user_id, zone_id, checked_in_at)
SELECT id, 'indoor-track', now() - interval '10 minutes' FROM users WHERE username = 'maya';

-- Ryan planned a lift tomorrow 7-9 AM and invited Nathan (pending) and Carter (accepted)
WITH lift AS (
  INSERT INTO lifts (owner_id, date, start_hour, end_hour, time_label, preference, expected_crowd_level,
                     expected_occupancy_percent, zone_id, zone_label, note)
  SELECT id, CURRENT_DATE + 1, 7, 9, '7 AM – 9 AM', 'weights', 'low', 12, 'free-weights', 'Free Weights',
         'Push day, then a quick cooldown on the track'
  FROM users WHERE username = 'ryan'
  RETURNING id
)
INSERT INTO lift_invites (lift_id, invitee_id, status, responded_at)
SELECT lift.id, u.id, CASE u.username WHEN 'carter' THEN 'accepted' ELSE 'pending' END,
       CASE u.username WHEN 'carter' THEN now() END
FROM lift, users u WHERE u.username IN ('nathan', 'carter');
"""


def apply_schema_and_seed() -> None:
    with connect() as c:
        c.execute(SCHEMA.read_text(encoding="utf-8"))
        c.execute(SEED)
    print("tables created and test users seeded (nathan, ryan, carter, maya)")


# --------------------------------------------------------------------------------------------
# Local cluster management (pg_ctl / initdb from the installed PostgreSQL)
# --------------------------------------------------------------------------------------------
def _bin(name: str) -> str:
    found = shutil.which(name)
    if found:
        return found
    for base in sorted(Path("C:/Program Files/PostgreSQL").glob("*/bin"), reverse=True):
        exe = base / f"{name}.exe"
        if exe.exists():
            return str(exe)
    sys.exit(f"{name} not found: install PostgreSQL or add its bin folder to PATH")


def _run(*args: str) -> None:
    subprocess.run(list(args), check=True)


def start() -> None:
    if is_up():
        print(f"already running on port {PORT}")
        return
    if not (PGDATA / "PG_VERSION").exists():
        sys.exit("no local cluster yet: run `python -m backend.db setup` first")
    # Detach the server from our stdin/stdout: otherwise it inherits the pipes and a caller that
    # waits for this command's output (a shell pipe, a CI step) hangs for as long as Postgres runs.
    subprocess.run([_bin("pg_ctl"), "-D", str(PGDATA), "-l", str(PGLOG), "-o", f"-p {PORT}", "-w", "start"],
                   check=True, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"postgres running on port {PORT} (log: {PGLOG})")


def stop() -> None:
    if (PGDATA / "postmaster.pid").exists():
        _run(_bin("pg_ctl"), "-D", str(PGDATA), "-m", "fast", "-w", "stop")
    else:
        print("not running")


def setup() -> None:
    if not (PGDATA / "PG_VERSION").exists():
        PGDATA.parent.mkdir(parents=True, exist_ok=True)
        # trust auth on localhost only: fine for a local demo database, never for a real server
        _run(_bin("initdb"), "-D", str(PGDATA), "-U", DB_USER, "-A", "trust", "-E", "UTF8", "--locale=C")
    start()
    with psycopg.connect(f"postgresql://{DB_USER}@localhost:{PORT}/postgres", autocommit=True) as c:
        if not c.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,)).fetchone():
            c.execute(f'CREATE DATABASE "{DB_NAME}"')
    apply_schema_and_seed()


def status() -> None:
    print(f"{DATABASE_URL}: {'up' if is_up() else 'DOWN'}")
    if is_up():
        with connect() as c:
            for t in ("users", "friendships", "checkins", "lifts", "lift_invites"):
                print(f"  {t:13} {c.execute(f'SELECT count(*) AS n FROM {t}').fetchone()['n']} rows")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    {"setup": setup, "start": start, "stop": stop, "reset": apply_schema_and_seed, "status": status}.get(
        cmd, lambda: sys.exit(__doc__))()
