-- Instructions table migration
CREATE TABLE IF NOT EXISTS instructions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES user_stats(id),
  project_id TEXT REFERENCES projects(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS instructions_user_order_unique
  ON instructions (user_id, "order")
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS instructions_user_project_idx
  ON instructions (user_id, project_id)
  WHERE deleted_at IS NULL;

