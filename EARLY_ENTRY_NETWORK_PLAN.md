# CLINED v36.7 — Early Entry Network Safe

Release focus: Vercel + Neon Paid, no VPS required for Early Entry.

## Main changes
- `online-sync.js`: `force=true` now means run sync immediately; it no longer forces a full state download when a delta cursor exists.
- Public question-bank API: warm-instance cache for full bank JSON, with invalidation after admin updates.
- Public question-bank catalog: short browser cache window.
- Leaderboard: reduced from 50 to 20 rows and no longer auto-fetches 1.5 seconds after boot.
- Bank frontend requests use normal browser caching/ETag behavior instead of `no-store`.

## Important architecture
Static JSON question banks may be used as the preferred content source when they are bundled into the deployment. This release does not invent or copy missing bank files. Neon remains the source of truth for the existing server-managed banks and global admin updates.

## Early Entry target
Start with 50 users, then 150, then 300–500 after stability checks. Monitor Neon network transfer, compute, and Vercel errors.
