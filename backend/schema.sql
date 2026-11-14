-- Comfort Zone social data: users, friends, check-ins ("at UREC now"), lifts and lift invites.
-- Applied by `python -m backend.db setup` / `reset`. Safe to re-run (drops and recreates).

DROP TABLE IF EXISTS lift_invites, lifts, checkins, friendships, users CASCADE;

CREATE TABLE users (
    id           SERIAL PRIMARY KEY,
    username     TEXT NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{2,24}$'),
    display_name TEXT NOT NULL,
    color        TEXT NOT NULL DEFAULT '#450084',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per direction. A request is (requester -> addressee, 'pending');
-- accepting it marks that row 'accepted' and adds the reverse row.
CREATE TABLE friendships (
    user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status     TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, friend_id),
    CHECK (user_id <> friend_id)
);

-- "At UREC" = an open check-in from the last 3 hours.
CREATE TABLE checkins (
    id             SERIAL PRIMARY KEY,
    user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    zone_id        TEXT,                          -- app zone id (shared/app_zones.json), optional
    checked_in_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_out_at TIMESTAMPTZ
);
CREATE INDEX checkins_open ON checkins (user_id) WHERE checked_out_at IS NULL;

-- A planned workout ("lift"), saved from the Plan page.
CREATE TABLE lifts (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id                   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date                       DATE NOT NULL,
    start_hour                 INT NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
    end_hour                   INT NOT NULL CHECK (end_hour BETWEEN 0 AND 23),
    time_label                 TEXT NOT NULL,
    preference                 TEXT NOT NULL DEFAULT 'any',
    expected_crowd_level       TEXT NOT NULL DEFAULT 'low',
    expected_occupancy_percent INT NOT NULL DEFAULT 0,
    zone_id                    TEXT,
    zone_label                 TEXT,
    scenario_id                TEXT,
    scenario_label             TEXT,
    note                       TEXT NOT NULL DEFAULT '',
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lifts_owner_date ON lifts (owner_id, date);

CREATE TABLE lift_invites (
    lift_id      UUID NOT NULL REFERENCES lifts(id) ON DELETE CASCADE,
    invitee_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    PRIMARY KEY (lift_id, invitee_id)
);
CREATE INDEX lift_invites_invitee ON lift_invites (invitee_id);
