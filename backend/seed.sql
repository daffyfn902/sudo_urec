-- Test users and a small story to demo with. Applied after schema.sql by `python -m backend.db reset`
-- and by the Docker container on its first start (docker-compose.yml).

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
