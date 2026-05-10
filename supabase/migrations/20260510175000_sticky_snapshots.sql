/*
  # Sticky cloud snapshot (per authenticated user)

  Stores the full Sticky JSON blob so boards, notes, categories and settings
  sync across browsers/devices and follow the signed-in account instead of
  living only in each device's localStorage.
*/

CREATE TABLE IF NOT EXISTS sticky_snapshots (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sticky_snapshots_updated_at ON sticky_snapshots (updated_at DESC);

ALTER TABLE sticky_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sticky_select_own"
  ON sticky_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "sticky_insert_own"
  ON sticky_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sticky_update_own"
  ON sticky_snapshots FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sticky_delete_own"
  ON sticky_snapshots FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
