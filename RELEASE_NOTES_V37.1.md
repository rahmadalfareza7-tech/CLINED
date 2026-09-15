# CLINED v37.1 — Bank Loader Hardening

- Bank catalog is seeded synchronously from embedded metadata.
- Manifest fetch is now optional/fallback-safe.
- Static question URLs are absolute from `/seed-data/banks/<id>.json`.
- Static bank loading uses no-store to avoid stale deployment assets.
- 11 banks / 1,169 questions retained.
