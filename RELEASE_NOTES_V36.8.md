# CLINED v36.8 — Static Question Banks Final

- Added 11 unique static question banks from the available JSON sources.
- Stable question JSON is served from the deployment, not Neon.
- Static banks load on demand per selected bank.
- If Neon contains a newer admin-published version, that newer server bank overrides the static baseline.
- Duplicate identical source files are not duplicated.
- Original question wording, options, correct answer, and clinical explanations are preserved; only runtime field normalization is applied.
