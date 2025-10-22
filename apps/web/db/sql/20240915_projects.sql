-- Projects migration script
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES user_stats(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS projects_user_id_name_unique
  ON projects (user_id, name)
  WHERE deleted_at IS NULL;

INSERT INTO projects (id, user_id, name, color, instructions)
SELECT
  us.id,
  us.id,
  'General',
  '#64748B',
  NULL
FROM user_stats AS us
ON CONFLICT (id) DO NOTHING;

ALTER TABLE chats
  RENAME COLUMN user_id TO project_id;

ALTER TABLE chats
  ADD CONSTRAINT chats_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES projects(id);

CREATE INDEX IF NOT EXISTS chats_project_id_idx
  ON chats (project_id)
  WHERE deleted_at IS NULL;
