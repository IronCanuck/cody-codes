/*
  # Daily report archive: metadata table + private storage bucket for PDF/PNG files
*/

CREATE TABLE IF NOT EXISTS saved_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL,
  day_start_time timestamptz NOT NULL,
  day_end_time timestamptz NOT NULL,
  day_hours numeric(6, 2) NOT NULL DEFAULT 0,
  job_count int NOT NULL DEFAULT 0,
  pdf_storage_path text,
  png_storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_daily_reports_report_date ON saved_daily_reports (report_date DESC);
CREATE INDEX IF NOT EXISTS idx_saved_daily_reports_created_at ON saved_daily_reports (created_at DESC);

ALTER TABLE saved_daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select saved_daily_reports"
  ON saved_daily_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert saved_daily_reports"
  ON saved_daily_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete saved_daily_reports"
  ON saved_daily_reports FOR DELETE
  TO authenticated
  USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('job-reports', 'job-reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "job-reports bucket read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'job-reports');

CREATE POLICY "job-reports bucket insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'job-reports');

CREATE POLICY "job-reports bucket update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'job-reports')
  WITH CHECK (bucket_id = 'job-reports');

CREATE POLICY "job-reports bucket delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'job-reports');
