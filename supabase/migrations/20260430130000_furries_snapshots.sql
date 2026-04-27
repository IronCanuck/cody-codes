/*
  # Furries cloud snapshot (per authenticated user)

  Stores the full Furries JSON blob so pet profiles and reminders sync across
  browsers and follow the signed-in account (not only this device’s localStorage).
*/

CREATE TABLE IF NOT EXISTS furries_snapshots (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_furries_snapshots_updated_at ON furries_snapshots (updated_at DESC);

ALTER TABLE furries_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "furries_select_own"
  ON furries_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "furries_insert_own"
  ON furries_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "furries_update_own"
  ON furries_snapshots FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "furries_delete_own"
  ON furries_snapshots FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
