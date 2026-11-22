ALTER TABLE users ADD COLUMN IF NOT EXISTS badge_100k_at TIMESTAMPTZ;

UPDATE users u
   SET badge_100k_at = now()
 WHERE badge_100k_at IS NULL
   AND (
     COALESCE((
       SELECT CASE WHEN ls.state->'gaster_v11_xp'->>'value' ~ '^[0-9]+(\.[0-9]+)?$'
                   THEN ROUND((ls.state->'gaster_v11_xp'->>'value')::numeric) ELSE 0 END
         FROM learning_states ls WHERE ls.user_id = u.id
     ), 0) >= 100000
     OR COALESCE((
       SELECT SUM(e.amount)
         FROM xp_events e
        WHERE e.user_id = u.id AND e.kind <> 'userbank' AND LOWER(e.ref) NOT LIKE 'duel-local:%'
     ), 0) >= 100000
   );
