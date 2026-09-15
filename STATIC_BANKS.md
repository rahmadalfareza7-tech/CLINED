# Static Question Banks — Final Early Entry

The stable baseline question banks are shipped inside `seed-data/banks/` and loaded on demand by the browser. This avoids downloading the question JSON from Neon for normal student sessions.

When an admin edits a seeded bank through the server, the server version is incremented. If the server version is newer than the static baseline, CLINED loads the server copy for that bank.

The source JSON content was structurally normalized only to the CLINED runtime schema (`soal`, `opsi`, `jawabanBenar`, `pembahasan`) while preserving the original clinical explanation object in `pembahasan_klinis`.

Included unique banks: 11. Duplicate files with identical bytes were not duplicated.
