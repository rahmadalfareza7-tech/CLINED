CREATE TABLE IF NOT EXISTS content_packages (
  id UUID PRIMARY KEY,
  module VARCHAR(3) NOT NULL CHECK (module IN ('UAB', 'UPI')),
  title VARCHAR(160) NOT NULL,
  block VARCHAR(80),
  visibility VARCHAR(10) NOT NULL CHECK (visibility IN ('public', 'private')),
  owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  questions JSONB NOT NULL,
  schema_version VARCHAR(20) NOT NULL DEFAULT '1.0',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT content_package_scope CHECK (
    (module = 'UAB' AND visibility = 'public' AND owner_user_id IS NULL)
    OR (module = 'UPI' AND visibility = 'public' AND owner_user_id IS NULL)
    OR (module = 'UPI' AND visibility = 'private' AND owner_user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS content_packages_catalog_idx ON content_packages (module, visibility, block, updated_at DESC);
CREATE INDEX IF NOT EXISTS content_packages_owner_idx ON content_packages (owner_user_id, updated_at DESC);
