/*
  # Notepad cloud snapshot (per authenticated user)

  Stores the full Notepad JSON blob (folders, notes, settings) so it syncs
  across browsers/devices and follows the signed-in account instead of
  living only in each device's localStorage.
*/

CREATE TABLE IF NOT EXISTS notepad_snapshots (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notepad_snapshots_updated_at ON notepad_snapshots (updated_at DESC);

ALTER TABLE notepad_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notepad_select_own"
  ON notepad_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notepad_insert_own"
  ON notepad_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notepad_update_own"
  ON notepad_snapshots FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notepad_delete_own"
  ON notepad_snapshots FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
