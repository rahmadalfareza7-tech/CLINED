-- Tambah role 'helper': akses Kelola Konten (UAB + UPI) tanpa akses manajemen pengguna/aktivitas/pengumuman.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'admin', 'developer', 'helper'));
