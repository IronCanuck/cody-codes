/*
  # Family Tree cloud snapshot (per authenticated user)

  Stores the full Family Tree JSON blob (members, albums, media, settings)
  so the tree, portraits, and tagged memories follow the signed-in account
  across browsers and devices instead of living only in localStorage.
*/

CREATE TABLE IF NOT EXISTS family_tree_snapshots (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_tree_snapshots_updated_at
  ON family_tree_snapshots (updated_at DESC);

ALTER TABLE family_tree_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_tree_select_own"
  ON family_tree_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "family_tree_insert_own"
  ON family_tree_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "family_tree_update_own"
  ON family_tree_snapshots FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "family_tree_delete_own"
  ON family_tree_snapshots FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
