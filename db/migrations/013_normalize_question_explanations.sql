-- Normalize per-option explanations for existing PostgreSQL question banks.
-- Source banks contain pembahasan_klinis {A,B,C,...}; the UI expects pembahasanPilihan[].
-- Also replace the aggregate pembahasan with the explanation for the correct option.
WITH normalized AS (
  SELECT
    qb.id,
    COALESCE(
      jsonb_agg(
        q_new
        ORDER BY ord
      ),
      '[]'::jsonb
    ) AS questions
  FROM question_banks qb
  CROSS JOIN LATERAL jsonb_array_elements(qb.questions) WITH ORDINALITY AS x(q, ord)
  CROSS JOIN LATERAL (
    SELECT
      CASE
        WHEN jsonb_typeof(x.q->'pembahasan_klinis') = 'object'
        THEN jsonb_set(
          jsonb_set(
            x.q,
            '{pembahasanPilihan}',
            (
              SELECT jsonb_agg(COALESCE(x.q->'pembahasan_klinis'->chr(65 + (i - 1)), ''::jsonb) ORDER BY i)
              FROM generate_series(1, jsonb_array_length(x.q->'opsi')) AS g(i)
            )
          ),
          '{pembahasan}',
          COALESCE(
            x.q->'pembahasan_klinis'->chr(65 + ((x.q->>'jawabanBenar')::int)),
            x.q->'pembahasan',
            '""'::jsonb
          )
        )
        ELSE x.q
      END AS q_new
  ) patched
  GROUP BY qb.id
)
UPDATE question_banks qb
SET questions = normalized.questions,
    updated_at = now()
FROM normalized
WHERE qb.id = normalized.id;
