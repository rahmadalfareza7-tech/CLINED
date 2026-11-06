# Catatan rilis — wajib dibaca sebelum deploy

1. **Setiap rilis, ubah nama `CACHE` di `sw.js`** (mis. `clined-web-v94-...`). Perubahan isi `sw.js` itulah yang memicu banner "Versi baru siap" di perangkat mahasiswa. Tanpa itu, tab yang sedang terbuka tidak tahu ada versi baru.
2. `pg_dump` sebelum deploy. Migrasi baru: 028 (statistik pemakaian), 029 (chat, tempat bertanya, gaya pengumuman), 030 (buku besar XP server). Migrasi 013_normalize diperbaiki (`''::jsonb` error di PostgreSQL baru).
3. Statistik pemakaian hanya menyimpan hitungan dan kode acak per minggu (HMAC), tidak menyimpan ID akun. Beri tahu mahasiswa di halaman privasi/kebijakan Anda. Mereka bisa mematikannya di Rencana Belajar → Pengaturan.

4. **Restart proses Node setelah deploy.** File `lib/*.mjs` dimuat sekali saat server hidup. Tanpa restart, status tetap berlaku lama (hanya teman) walau tampilan sudah baru. Halaman Status menampilkan peringatan jika server belum diperbarui.
5. Chat: pesan dihapus otomatis setelah 48 jam (rolling per pesan). Tempat bertanya diatur admin di Kelola Konten, tab Pengguna (kotak centang, bisa dobel dengan Helper/Admin).
6. Edit soal bank bawaan lewat layar soal mengubah tabel `question_banks`. Menjalankan `db:seed` ulang akan menimpa suntingan.
7. XP & peringkat: XP kini dicatat di server (tabel `xp_events`), satu soal/kartu dihitung sekali per hari, batas 3000 XP/hari. Peringkat mingguan mulai 0 setelah rilis ini; XP lama hanya tampil di kolom total.

## Rilis v98 — notifikasi chat ke HP, panel admin baru, chat baru
8. **Migrasi baru: 031 (`push_subscriptions`).** Berjalan otomatis saat server start.
9. **Notifikasi HP (Web Push) butuh kunci VAPID — tanpa ini fitur tidak aktif** (tombol lonceng tidak muncul, chat tetap normal):
   1. Di server: `npm run push:keys` → salin 3 baris keluaran (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) ke `.env`.
   2. Restart proses Node.
   3. Jangan ganti kunci setelah dipakai; semua langganan lama jadi tidak valid.
   4. Situs wajib HTTPS (sudah, kalau lewat domain).
   5. Pengguna mengaktifkan sendiri lewat tombol 🔔 di tab Chat. Pesan baru → notifikasi muncul walau app ditutup; ketuk notifikasi → langsung buka percakapan.
   6. iPhone/iPad: hanya jalan jika CLINED sudah ditambahkan ke Layar Utama (iOS 16.4+). Aplikasi menampilkan petunjuknya.
   7. Isi notifikasi memuat nama pengirim dan 120 karakter awal pesan; lewat layanan push Google/Apple/Mozilla, terenkripsi end-to-end (RFC 8291).
10. Panel admin "Pengguna & aktivitas" ditulis ulang (`js/admin-people.js`, `css/admin-people.css`): kartu ringkas, pencarian, filter role, ubah role dengan tombol besar, sakelar Tempat bertanya, aktivitas dikelompokkan per hari.
11. Chat didesain ulang (`css/chat.css`): header gradasi, avatar berwarna, bubble bergradasi, kolom tulis dengan tombol kirim bulat.
