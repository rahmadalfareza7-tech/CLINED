# CLINED v8 Network Audit / v9 Optimization

## Root cause found
The main network-transfer risk was `js/content-manager.js` calling:

`/api/content/packages?module=UAB`

from `syncUabNodeStates()` only to determine which UAB blocks contain questions. That endpoint returned the **entire `questions` JSON payload** for every package.

The same function could also be triggered multiple times during startup and by every `clined:bank-updated` event while UAB packages were being registered. This could multiply transfer by the number/size of UAB packages.

## Changes in v9
- Added `meta=1` mode to `/api/content/packages` so catalog/node-state checks return metadata + `question_count`, not question payloads.
- `syncUabNodeStates()` now uses the metadata-only endpoint.
- Removed an unnecessary full UAB package fetch from global bank catalog startup.
- Debounced UAB node-state refreshes triggered by bank registration events.
- Deduplicated content-manager boot for the same authenticated user.
- Leaderboard teaser no longer performs a second independent fetch 1.5 seconds after a page load; it reuses the normal loader.

## Important
The full UAB question payload is still fetched when the UAB page is actually opened, so the learning functionality is preserved.

## Remaining optimization opportunity
`/api/sync` still returns the user's complete learning state on GET and after POST. If the learning state grows large, a later revision can convert this to delta-based sync. This is a secondary optimization compared with the full content-package issue fixed here.


## v10 — Delta learning-state sync

- Added `learning_state_entries` to store each learning key independently.
- Existing aggregate `learning_states` is backfilled once during migration 013.
- `/api/sync?since=...` now returns only changed keys after the saved cursor.
- Full state is downloaded only when a user has no sync cursor (first sync/new device).
- POST sync returns only accepted changed keys instead of the user's complete learning state.
- Client queues same-tab localStorage changes and coalesces repeated writes per key.
- Periodic pull increased from 5 minutes to 10 minutes.
- Removed the extra `/api/auth/me` request from every sync cycle; auth-ready triggers a sync after login/registration.
- Remote application is suppressed from generating echo operations.

This reduces network transfer as learning history grows because routine pulls are proportional to changed keys, not the entire account state.
