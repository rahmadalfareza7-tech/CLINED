-- Production ops hardening: persistent serverless rate-limit buckets & first-party client error telemetry
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_reset
  ON rate_limit_buckets (reset_at);

CREATE TABLE IF NOT EXISTS client_error_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  kind VARCHAR(32) NOT NULL DEFAULT 'error',
  message TEXT NOT NULL,
  source TEXT,
  line INTEGER NOT NULL DEFAULT 0,
  col INTEGER NOT NULL DEFAULT 0,
  stack TEXT,
  view_id VARCHAR(64),
  user_agent TEXT,
  app_version VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_error_logs_created
  ON client_error_logs (created_at DESC);
