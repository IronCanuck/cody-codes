/*
  # Require authentication for jobs and settings

  Single-user app: replace anonymous policies with authenticated-only access.
  Disable public sign-ups in Supabase (Authentication → Providers) so only your account can sign in.
*/

-- jobs: remove anon policies
DROP POLICY IF EXISTS "Anon can view all jobs" ON jobs;
DROP POLICY IF EXISTS "Anon can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Anon can update jobs" ON jobs;
DROP POLICY IF EXISTS "Anon can delete jobs" ON jobs;

-- settings: remove anon policies
DROP POLICY IF EXISTS "Anon can view settings" ON settings;
DROP POLICY IF EXISTS "Anon can insert settings" ON settings;
DROP POLICY IF EXISTS "Anon can update settings" ON settings;
DROP POLICY IF EXISTS "Anon can delete settings" ON settings;

-- authenticated full CRUD (only your user should exist if sign-up is disabled)
CREATE POLICY "Authenticated users can select jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can select settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete settings"
  ON settings FOR DELETE
  TO authenticated
  USING (true);
