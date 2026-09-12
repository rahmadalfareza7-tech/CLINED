
> Deployment: see `DEPLOY_VERCEL_NEON.md` for the GitHub → Neon → Vercel setup and `/api/health` verification.

# CLINED Online

CLINED mempertahankan aplikasi belajar mobile existing—Bank Soal, UAB, UPI, flashcard, normal values, bookmark, history, statistik, splash, motion, dan floating navigation—dengan fondasi online PostgreSQL.

## Menjalankan lokal

1. Gunakan Node.js 20+ dan PostgreSQL.
2. Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL`.
3. Jalankan `npm install`.
4. Jalankan `npm run db:migrate` dan `npm run db:seed`.
5. Jalankan `npm run validate:banks`, lalu `npm start`.

### Deploy ke Vercel + Neon

Project ini sudah disiapkan agar repository dapat menjadi root project Vercel tanpa konfigurasi `builds`/`routes` legacy. Vercel akan melayani file statis dari root dan mengenali `api/[...path].mjs` sebagai Vercel Function.

**Struktur repository yang benar:** `index.html`, `package.json`, `vercel.json`, `api/`, `lib/`, `css/`, `js/`, `assets/`, dan `banks/` harus berada langsung di root repository.

Langkah deployment:
1. Upload **isi folder project ini** ke root repository GitHub. Jangan membuat folder pembungkus `CLINED_OFFLINE_RELEASE/` di dalam repository.
2. Buat database PostgreSQL di Neon dan salin `DATABASE_URL`.
3. Jalankan migrasi + seed sekali dari laptop/terminal: `npm install`, lalu `npm run db:migrate` dan `npm run db:seed`.
4. Di Vercel, import repository GitHub tersebut. **Root Directory: `./`**. Framework Preset: **Other**. Build Command: kosong/default. Output Directory: kosong/default.
5. Tambahkan Environment Variables untuk Production: `DATABASE_URL`, `NODE_ENV=production`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `AUTH_COOKIE_SECURE=true`.
6. Deploy. Setelah selesai, tes `https://domain-kamu.vercel.app/` lalu `https://domain-kamu.vercel.app/api/health`.

**Catatan penting:** jangan menaruh `.env` di GitHub. File `.env.example` hanya template. `DATABASE_URL` dan password admin harus diisi melalui Environment Variables Vercel.

`api/[...path].mjs` hanya menangani API. `local-server.mjs` tetap dipertahankan untuk local/self-host/Render dan tidak menjadi entrypoint Vercel.

### Deploy ke Render/self-host (alternatif)

Pakai `local-server.mjs` (bukan `api/`), sudah support `PORT`/`HOST` dinamis. Build: `npm install`. Start: `npm start`.

### Akun admin

Akun admin dibuat atau disinkronkan otomatis pada request pertama ke `/api/*`. Atur `ADMIN_USERNAME`, `ADMIN_PASSWORD` (minimal 12 karakter), dan `ADMIN_NAME` di environment variables terlebih dahulu. Server tidak pernah membuat password admin acak, karena password yang hanya muncul di log Vercel tidak bisa diandalkan untuk pemulihan akun.

Untuk mereset admin tanpa akses langsung ke Neon: ganti `ADMIN_PASSWORD` di Vercel, set sementara `ADMIN_RESET_PASSWORD=true`, redeploy, lalu buka `/api/health`. Setelah bisa masuk, kembalikan `ADMIN_RESET_PASSWORD=false` dan redeploy agar perubahan password dari halaman Account tidak tertimpa. Perintah manual `npm run admin:create` tetap tersedia untuk reset dari terminal.

### Pendaftaran akun pengguna

Pendaftaran akun (signup) hanya membutuhkan **nama, username, dan password** — tidak ada kolom email/Gmail sama sekali, baik di form maupun di database (kolom `email` bersifat opsional/NULL untuk semua akun).

## Production

Atur `DATABASE_URL`, `DATABASE_SSL` bila diperlukan, `ADMIN_EMAILS`, dan `AUTH_COOKIE_SECURE=true`. Jalankan migrasi sebelum aplikasi baru menerima traffic. Health check tersedia pada `/api/health`.

Password di-hash pada server; browser hanya menerima cookie sesi `HttpOnly`. State belajar yang relevan tetap tersedia di perangkat saat offline dan dikirim melalui antrean idempotent ketika koneksi kembali.

Lihat `AUDIT.md` untuk hasil audit source dan urutan migrasi yang disarankan.
