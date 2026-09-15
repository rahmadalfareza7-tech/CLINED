# CLINED v36.7 — Early Entry Network Safe

This release is based on CLINED v10 delta-sync.

Goal: reduce unnecessary Neon egress while preserving the existing CLINED concept/UI/UX.

Key fix: a forced sync triggered by `online`, `auth-ready`, or page load no longer turns an existing delta cursor into a full `/api/sync` download.

Question banks are still server-managed in this baseline. If the project owner supplies/bundles the full static JSON bank set, the next revision can wire those files as the preferred source for question content while keeping Neon for accounts, progress, attempts, leaderboard, and admin overrides.
