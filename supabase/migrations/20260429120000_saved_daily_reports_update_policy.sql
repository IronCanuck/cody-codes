/*
  # Allow updating saved daily reports (e.g. bulk-edit work day times on Earnings).
*/

DROP POLICY IF EXISTS "Authenticated users can update saved_daily_reports" ON saved_daily_reports;
CREATE POLICY "Authenticated users can update saved_daily_reports"
  ON saved_daily_reports FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
