# Catatan VPS untuk fitur realtime (duel / teman)

Spesifikasi acuan: Ubuntu 24, 2 CPU, 4 GB RAM, 50 GB.

## 1. Satu proses Node saja
Pembatas laju dan cache ada di memori proses. Jangan jalankan mode cluster (`pm2 -i max`). Satu proses cukup untuk ratusan pengguna.

## 2. nginx (jika dipakai) — wajib untuk SSE
```nginx
location = /api/stream {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1h;
    chunked_transfer_encoding off;
}
```

## 3. Batas file descriptor
Di unit systemd: `LimitNOFILE=65535`. Tiap pengguna online menahan satu koneksi.

## 4. PostgreSQL
Default `DATABASE_POOL_SIZE=5` cukup, karena koneksi SSE tidak memegang koneksi DB.
Cadangkan database (`pg_dump`) sebelum deploy: migrasi baru berjalan otomatis saat server mulai.
