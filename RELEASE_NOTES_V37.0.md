# CLINED v37.0 — Fix Bank Loading / Deployment Package

- ZIP package is now FLAT: `index.html`, `js/`, `seed-data/`, `api/`, etc. are at the deployment root.
- Static bank manifest uses a relative URL: `./seed-data/manifest.json`, so it works from a root deployment and project subpath.
- Static bank JSON URLs remain relative to the manifest.
- Cache-buster updated for `app.js` and `question-bank-engine.js`.
- 11 static banks / 1,169 questions preserved.
