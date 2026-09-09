# Audit awal CLINED Offline

## Ringkasan

CLINED adalah single-page web app vanilla JavaScript, bukan template dashboard. UI mobile, floating navigation, splash, animasi, UAB, UPI, flashcard, normal values, bank soal, history, bookmark, statistik, dan Account sudah tersedia dan dipertahankan.

## Peta source

- `index.html`: struktur seluruh halaman, modal, dan navigasi aplikasi.
- `css/style.css` dan `css/motion.css`: visual identity serta motion existing.
- `js/app.js`: quiz engine, UAB/UPI, flashcard, statistik, Account, dan state lokal.
- `banks/*.json`: tiga bank soal existing; validator tersedia di `tools/validate-banks.mjs`.
- `js/question-bank-engine.js`: validasi dan cache bank menggunakan IndexedDB.
- `sw.js` dan `manifest.webmanifest`: fondasi PWA dan cache aset.
- `server.mjs`: sebelumnya hanya autentikasi cookie serta file `data/users.json`.

## Risiko sebelum revisi

1. Akun disimpan di file JSON sehingga tidak aman untuk scale, tidak transactional, dan tidak siap multi-instance.
2. Progress, bookmark, history, statistik, dan UPI custom cards tersebar pada banyak key `localStorage`; belum ada sinkronisasi user.
3. Tidak ada role admin, migration database, API data belajar, atau strategi idempotensi offline queue.
4. PWA meng-cache aset dengan baik, tetapi belum menyinkronkan mutasi data setelah koneksi kembali.
5. Source memakai data bank JSON sebagai baseline; ini perlu diimpor bertahap ke PostgreSQL tanpa mengubah format/isi pertanyaan.

## Implementasi fondasi pada revisi ini

- PostgreSQL schema dan migrasi repeatable di `db/migrations`.
- Auth server-side dengan password scrypt, session database yang dapat dicabut, cookie HttpOnly/SameSite, validasi input, rate limit, origin validation, dan security headers.
- State belajar tersimpan server-side sebagai JSONB dengan operasi queue idempotent per pengguna.
- Browser tetap dapat belajar offline dan akan mencoba sinkron otomatis saat online, halaman ditutup, dan setiap 30 detik.
- Seeder mengimpor bank JSON existing ke PostgreSQL tanpa rewrite bank atau UI.

## Langkah deployment

1. Jalankan `npm install`.
2. Atur `DATABASE_URL`, `DATABASE_SSL`, `ADMIN_EMAILS`, dan `AUTH_COOKIE_SECURE=true` di production.
3. Jalankan `npm run db:migrate`, kemudian `npm run db:seed`.
4. Validasi bank dengan `npm run validate:banks`, lalu `npm start`.

## Sisa pekerjaan bertahap yang direkomendasikan

1. Hubungkan pembacaan bank JSON ke endpoint PostgreSQL sesudah data seed diverifikasi.
2. Tambahkan UI admin khusus yang tetap bergaya CLINED untuk CRUD bank, materi, flashcard, normal values, UAB, dan UPI; authorization sudah harus selalu server-side.
3. Tambahkan test integrasi menggunakan PostgreSQL test database untuk auth, ownership, sync conflict, dan migration.
4. Uji migrasi dari browser dengan data progres nyata dan tetapkan kebijakan konflik per field sebelum rollout luas.
