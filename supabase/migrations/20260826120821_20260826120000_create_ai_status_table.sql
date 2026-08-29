CREATE TABLE IF NOT EXISTS ai_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance')),
  maintenance_message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_ai_status" ON ai_status;
CREATE POLICY "select_ai_status" ON ai_status FOR SELECT
  TO authenticated USING (true);

INSERT INTO ai_status (ai_id, status, maintenance_message)
VALUES
  ('nutrition', 'active', NULL),
  ('training', 'active', NULL),
  ('calendar', 'active', NULL),
  ('dashboard', 'active', NULL)
ON CONFLICT (ai_id) DO NOTHING;