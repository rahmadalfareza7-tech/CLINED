-- Latihan Materi: paket soal per blok + judul materi (module 'MAT'), dikelola admin/helper.
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'content_packages'::regclass AND contype = 'c'
             AND pg_get_constraintdef(oid) ILIKE '%module%'
  LOOP
    EXECUTE format('ALTER TABLE content_packages DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE content_packages
  ADD CONSTRAINT content_packages_module_check CHECK (module IN ('UAB', 'UPI', 'MAT'));

ALTER TABLE content_packages
  ADD CONSTRAINT content_package_scope CHECK (
    (module IN ('UAB', 'MAT') AND visibility = 'public' AND owner_user_id IS NULL)
    OR (module = 'UPI' AND visibility = 'public' AND owner_user_id IS NULL)
    OR (module = 'UPI' AND visibility = 'private' AND owner_user_id IS NOT NULL)
  );
