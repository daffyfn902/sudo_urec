"""Social API: test users, friends, "at UREC" check-ins, lifts (saved plans) and lift invites.

There is no real login yet. The app sends the acting user's username in the `X-User` header
(the Friends page has a "signed in as" switcher over the seeded test users). Swap `current_user`
for real auth later; nothing else needs to change.
"""

from __future__ import annotations

from datetime import date
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from . import core
from .db import connect

router = APIRouter(prefix="/api")
AT_UREC_WINDOW = "3 hours"      # an open check-in older than this no longer counts


# --------------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------------
def current_user(x_user: str | None = Header(default=None)) -> dict:
    username = (x_user or "nathan").strip().lower()
    with connect() as c:
        row = c.execute("SELECT * FROM users WHERE username = %s", (username,)).fetchone()
    if not row:
        raise HTTPException(401, f"unknown user {username!r}")
    return row


def public(u: dict) -> dict:
    return {"username": u["username"], "displayName": u["display_name"], "color": u["color"]}


def _user(c, username: str) -> dict:
    row = c.execute("SELECT * FROM users WHERE username = %s", (username.strip().lower(),)).fetchone()
    if not row:
        raise HTTPException(404, f"no user called {username!r}")
    return row


def _presence(c, user_ids: list[int]) -> dict[int, dict]:
    """Latest open, recent check-in per user."""
    if not user_ids:
        return {}
    rows = c.execute(
        f"""SELECT DISTINCT ON (user_id) user_id, zone_id, checked_in_at FROM checkins
            WHERE user_id = ANY(%s) AND checked_out_at IS NULL AND checked_in_at > now() - interval '{AT_UREC_WINDOW}'
            ORDER BY user_id, checked_in_at DESC""", (user_ids,)).fetchall()
    return {r["user_id"]: {"zoneId": r["zone_id"], "zoneLabel": core.APP_LABELS.get(r["zone_id"] or ""),
                           "since": r["checked_in_at"].isoformat()} for r in rows}


def _are_friends(c, a: int, b: int) -> bool:
    return c.execute("SELECT 1 FROM friendships WHERE user_id = %s AND friend_id = %s AND status = 'accepted'",
                     (a, b)).fetchone() is not None


def _lift_json(c, lift: dict, viewer_id: int) -> dict:
    owner = c.execute("SELECT * FROM users WHERE id = %s", (lift["owner_id"],)).fetchone()
    invites = c.execute(
        """SELECT u.*, i.status FROM lift_invites i JOIN users u ON u.id = i.invitee_id
           WHERE i.lift_id = %s ORDER BY u.display_name""", (lift["id"],)).fetchall()
    mine = next((i["status"] for i in invites if i["id"] == viewer_id), None)
    return {
        "id": str(lift["id"]), "createdAt": lift["created_at"].isoformat(), "date": lift["date"].isoformat(),
        "hour": lift["start_hour"], "endHour": lift["end_hour"], "timeLabel": lift["time_label"],
        "preference": lift["preference"], "expectedCrowdLevel": lift["expected_crowd_level"],
        "expectedOccupancyPercent": lift["expected_occupancy_percent"],
        "recommendedZoneId": lift["zone_id"], "recommendedZoneLabel": lift["zone_label"],
        "scenarioId": lift["scenario_id"], "scenarioLabel": lift["scenario_label"], "note": lift["note"],
        "owner": public(owner), "isMine": lift["owner_id"] == viewer_id, "myStatus": mine,
        "invites": [{"user": public(i), "status": i["status"]} for i in invites],
    }


# --------------------------------------------------------------------------------------------
# Users
# --------------------------------------------------------------------------------------------
@router.get("/users")
def users() -> list[dict]:
    """All users: for the test-user switcher."""
    with connect() as c:
        return [public(u) for u in c.execute("SELECT * FROM users ORDER BY id").fetchall()]


@router.get("/me")
def me(user: dict = Depends(current_user)) -> dict:
    with connect() as c:
        return {**public(user), "atUrec": _presence(c, [user["id"]]).get(user["id"])}


# --------------------------------------------------------------------------------------------
# Friends
# --------------------------------------------------------------------------------------------
@router.get("/friends")
def friends(user: dict = Depends(current_user)) -> dict:
    """Friends (with who's at UREC right now), plus incoming and outgoing requests."""
    with connect() as c:
        accepted = c.execute(
            """SELECT u.* FROM friendships f JOIN users u ON u.id = f.friend_id
               WHERE f.user_id = %s AND f.status = 'accepted' ORDER BY u.display_name""", (user["id"],)).fetchall()
        incoming = c.execute(
            """SELECT u.* FROM friendships f JOIN users u ON u.id = f.user_id
               WHERE f.friend_id = %s AND f.status = 'pending' ORDER BY f.created_at""", (user["id"],)).fetchall()
        outgoing = c.execute(
            """SELECT u.* FROM friendships f JOIN users u ON u.id = f.friend_id
               WHERE f.user_id = %s AND f.status = 'pending' ORDER BY f.created_at""", (user["id"],)).fetchall()
        here = _presence(c, [u["id"] for u in accepted])
    return {
        "friends": sorted(({**public(u), "atUrec": here.get(u["id"])} for u in accepted),
                          key=lambda f: (f["atUrec"] is None, f["displayName"])),
        "incoming": [public(u) for u in incoming], "outgoing": [public(u) for u in outgoing],
    }


class UsernameIn(BaseModel):
    username: str = Field(..., min_length=1, max_length=40)


@router.post("/friends/request")
def request_friend(body: UsernameIn, user: dict = Depends(current_user)) -> dict:
    with connect() as c:
        other = _user(c, body.username)
        if other["id"] == user["id"]:
            raise HTTPException(400, "you can't add yourself")
        if _are_friends(c, user["id"], other["id"]):
            return {"status": "accepted"}
        # they already asked me: accept instead of creating a second request
        if c.execute("SELECT 1 FROM friendships WHERE user_id = %s AND friend_id = %s AND status = 'pending'",
                     (other["id"], user["id"])).fetchone():
            return _accept(c, user, other)
        c.execute("""INSERT INTO friendships (user_id, friend_id, status) VALUES (%s, %s, 'pending')
                     ON CONFLICT DO NOTHING""", (user["id"], other["id"]))
    return {"status": "pending"}


def _accept(c, user: dict, other: dict) -> dict:
    updated = c.execute("""UPDATE friendships SET status = 'accepted'
                           WHERE user_id = %s AND friend_id = %s AND status = 'pending'""",
                        (other["id"], user["id"])).rowcount
    if not updated:
        raise HTTPException(404, f"no pending request from {other['username']}")
    c.execute("""INSERT INTO friendships (user_id, friend_id, status) VALUES (%s, %s, 'accepted')
                 ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted'""", (user["id"], other["id"]))
    return {"status": "accepted"}


@router.post("/friends/{username}/accept")
def accept_friend(username: str, user: dict = Depends(current_user)) -> dict:
    with connect() as c:
        return _accept(c, user, _user(c, username))


@router.delete("/friends/{username}")
def remove_friend(username: str, user: dict = Depends(current_user)) -> dict:
    """Unfriend, decline an incoming request, or cancel an outgoing one."""
    with connect() as c:
        other = _user(c, username)
        c.execute("""DELETE FROM friendships WHERE (user_id = %s AND friend_id = %s) OR (user_id = %s AND friend_id = %s)""",
                  (user["id"], other["id"], other["id"], user["id"]))
    return {"ok": True}


# --------------------------------------------------------------------------------------------
# Check-ins ("I'm at UREC")
# --------------------------------------------------------------------------------------------
class CheckinIn(BaseModel):
    zoneId: str | None = None


@router.post("/checkin")
def check_in(body: CheckinIn, user: dict = Depends(current_user)) -> dict:
    if body.zoneId is not None and body.zoneId not in core.APP_ZONES:
        raise HTTPException(404, f"unknown zone {body.zoneId!r}")
    with connect() as c:
        c.execute("UPDATE checkins SET checked_out_at = now() WHERE user_id = %s AND checked_out_at IS NULL", (user["id"],))
        c.execute("INSERT INTO checkins (user_id, zone_id) VALUES (%s, %s)", (user["id"], body.zoneId))
        return {"atUrec": _presence(c, [user["id"]])[user["id"]]}


@router.delete("/checkin")
def check_out(user: dict = Depends(current_user)) -> dict:
    with connect() as c:
        c.execute("UPDATE checkins SET checked_out_at = now() WHERE user_id = %s AND checked_out_at IS NULL", (user["id"],))
    return {"atUrec": None}


# --------------------------------------------------------------------------------------------
# Lifts (saved plans) and invites
# --------------------------------------------------------------------------------------------
class LiftIn(BaseModel):
    date: date
    hour: int = Field(..., ge=0, le=23)
    endHour: int = Field(..., ge=0, le=23)
    timeLabel: str = Field(..., max_length=40)
    preference: Literal["any", "weights", "cardio", "courts"] = "any"
    expectedCrowdLevel: Literal["low", "moderate", "high"] = "low"
    expectedOccupancyPercent: int = Field(0, ge=0, le=100)
    recommendedZoneId: str | None = None
    recommendedZoneLabel: str | None = None
    scenarioId: str | None = None
    scenarioLabel: str | None = None
    note: str = Field("", max_length=200)
    invite: list[str] = Field(default_factory=list, max_length=20)


def _invite(c, lift_id, owner: dict, usernames: list[str]) -> None:
    for name in dict.fromkeys(n.strip().lower() for n in usernames):
        other = _user(c, name)
        if not _are_friends(c, owner["id"], other["id"]):
            raise HTTPException(403, f"{other['display_name']} isn't your friend yet, so you can't invite them")
        c.execute("INSERT INTO lift_invites (lift_id, invitee_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                  (lift_id, other["id"]))


def _own_lift(c, lift_id: UUID, user: dict) -> dict:
    lift = c.execute("SELECT * FROM lifts WHERE id = %s", (lift_id,)).fetchone()
    if not lift:
        raise HTTPException(404, "lift not found")
    if lift["owner_id"] != user["id"]:
        raise HTTPException(403, "only the person who planned this lift can change it")
    return lift


@router.get("/lifts")
def lifts(user: dict = Depends(current_user)) -> dict:
    """My planned lifts, and lifts friends invited me to. Past lifts (before today) are left out."""
    with connect() as c:
        mine = c.execute("""SELECT * FROM lifts WHERE owner_id = %s AND date >= CURRENT_DATE
                            ORDER BY date, start_hour""", (user["id"],)).fetchall()
        invited = c.execute(
            """SELECT l.* FROM lifts l JOIN lift_invites i ON i.lift_id = l.id
               WHERE i.invitee_id = %s AND l.date >= CURRENT_DATE ORDER BY l.date, l.start_hour""",
            (user["id"],)).fetchall()
        return {"mine": [_lift_json(c, l, user["id"]) for l in mine],
                "invited": [_lift_json(c, l, user["id"]) for l in invited]}


@router.post("/lifts")
def create_lift(body: LiftIn, user: dict = Depends(current_user)) -> dict:
    with connect() as c:
        lift = c.execute(
            """INSERT INTO lifts (owner_id, date, start_hour, end_hour, time_label, preference, expected_crowd_level,
                                  expected_occupancy_percent, zone_id, zone_label, scenario_id, scenario_label, note)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
            (user["id"], body.date, body.hour, body.endHour, body.timeLabel, body.preference, body.expectedCrowdLevel,
             body.expectedOccupancyPercent, body.recommendedZoneId, body.recommendedZoneLabel, body.scenarioId,
             body.scenarioLabel, body.note.strip())).fetchone()
        _invite(c, lift["id"], user, body.invite)
        return _lift_json(c, lift, user["id"])


@router.delete("/lifts/{lift_id}")
def delete_lift(lift_id: UUID, user: dict = Depends(current_user)) -> dict:
    with connect() as c:
        _own_lift(c, lift_id, user)
        c.execute("DELETE FROM lifts WHERE id = %s", (lift_id,))
    return {"ok": True}


class InviteIn(BaseModel):
    usernames: list[str] = Field(..., min_length=1, max_length=20)


@router.post("/lifts/{lift_id}/invites")
def invite_to_lift(lift_id: UUID, body: InviteIn, user: dict = Depends(current_user)) -> dict:
    with connect() as c:
        lift = _own_lift(c, lift_id, user)
        _invite(c, lift_id, user, body.usernames)
        return _lift_json(c, lift, user["id"])


class RespondIn(BaseModel):
    status: Literal["accepted", "declined"]


@router.post("/lifts/{lift_id}/respond")
def respond(lift_id: UUID, body: RespondIn, user: dict = Depends(current_user)) -> dict:
    with connect() as c:
        updated = c.execute("""UPDATE lift_invites SET status = %s, responded_at = now()
                               WHERE lift_id = %s AND invitee_id = %s""", (body.status, lift_id, user["id"])).rowcount
        if not updated:
            raise HTTPException(404, "you weren't invited to this lift")
        lift = c.execute("SELECT * FROM lifts WHERE id = %s", (lift_id,)).fetchone()
        return _lift_json(c, lift, user["id"])
