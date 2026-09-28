-- Tambah role 'developer', migrate admin lama → developer,
-- admin baru hanya bisa upload soal UAB/UPI.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'admin', 'developer'));
UPDATE users SET role = 'developer' WHERE role = 'admin';
