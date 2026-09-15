# CLINED v36.9 — Static Bank Path Fix

## Perbaikan
- Memperbaiki pemuatan manifest bank soal agar selalu mengambil `/seed-data/manifest.json` dari root deployment.
- Memperbaiki URL 11 file bank JSON agar dihitung relatif terhadap URL manifest, sehingga tetap benar saat SPA dibuka dari route/path lain.
- Cache-buster JavaScript dinaikkan ke `static-banks-v2` agar browser tidak memakai app.js versi lama.
- Tidak mengubah isi soal, konsep, UI/UX, atau arsitektur hybrid static-bank + Neon.

## Bank yang disertakan
11 bank, total 1.169 soal.
