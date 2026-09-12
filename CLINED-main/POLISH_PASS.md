# CLINED 36.4.0 — Frontend & Backend Polish Pass

- Compacted **Langsung publikasikan** into a small inline publish option so it no longer inherits oversized control typography.
- Unified primary/admin control sizing, radius, typography, press feedback, disabled states, and mobile sizing.
- Added reduced-motion handling.
- Chat API schema initialization is now cached per server process instead of running `CREATE TABLE/INDEX IF NOT EXISTS` on every chat request.
- Chat polling prevents overlapping message requests.
- Chat client caches the user list briefly, supports forced refresh, and aborts hung requests after 8 seconds.
- Announcement create/update validation now rejects empty/invalid values and invalid expiry dates.
- Question-bank validation remains clean after the polish pass.
