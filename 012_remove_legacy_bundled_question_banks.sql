-- CLINED Online: remove legacy bundled question banks.
-- The application now starts with an empty global question-bank catalog.
-- Admin-created banks are not affected unless they reuse one of these legacy IDs.
DELETE FROM question_banks
WHERE id IN (
  'utama',
  'arsip2021',
  'pulmonis',
  'kedkel2022',
  'kedkel2021',
  'kedkel2020',
  'kedkom2020',
  'kedkom2021'
);
