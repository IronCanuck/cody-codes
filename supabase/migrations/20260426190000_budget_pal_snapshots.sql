/*
  # Budget Pal cloud snapshot (per authenticated user)

  Stores the full Budget Pal JSON blob so profiles and data sync across browsers
  and devices. RLS restricts each row to auth.uid().
*/

CREATE TABLE IF NOT EXISTS budget_pal_snapshots (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_pal_snapshots_updated_at ON budget_pal_snapshots (updated_at DESC);

ALTER TABLE budget_pal_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_pal_select_own"
  ON budget_pal_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "budget_pal_insert_own"
  ON budget_pal_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "budget_pal_update_own"
  ON budget_pal_snapshots FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "budget_pal_delete_own"
  ON budget_pal_snapshots FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
