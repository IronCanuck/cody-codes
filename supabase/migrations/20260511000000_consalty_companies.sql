/*
  # Consalty multi-company support

  Adds a `companies` table so the Consalty (Job Tracker) app can host a
  separate dashboard per company. Each `jobs`, `settings`, and
  `saved_daily_reports` row is scoped to a company. Existing rows are
  backfilled into a single auto-created "My company" record so nothing
  is lost.
*/

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT 'jd-green',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete companies"
  ON companies FOR DELETE
  TO authenticated
  USING (true);

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS company_id uuid
  REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS company_id uuid
  REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE saved_daily_reports
  ADD COLUMN IF NOT EXISTS company_id uuid
  REFERENCES companies(id) ON DELETE CASCADE;

DO $$
DECLARE
  default_company_id uuid;
  needs_backfill boolean := false;
BEGIN
  IF EXISTS (SELECT 1 FROM jobs WHERE company_id IS NULL) THEN
    needs_backfill := true;
  ELSIF EXISTS (SELECT 1 FROM settings WHERE company_id IS NULL) THEN
    needs_backfill := true;
  ELSIF EXISTS (SELECT 1 FROM saved_daily_reports WHERE company_id IS NULL) THEN
    needs_backfill := true;
  END IF;

  IF needs_backfill THEN
    INSERT INTO companies (name, sort_order)
    VALUES ('My company', 0)
    RETURNING id INTO default_company_id;

    UPDATE jobs SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE settings SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE saved_daily_reports SET company_id = default_company_id WHERE company_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_settings_company_id ON settings(company_id);
CREATE INDEX IF NOT EXISTS idx_saved_daily_reports_company_id ON saved_daily_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_sort_order ON companies(sort_order, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_settings_company_id
  ON settings(company_id) WHERE company_id IS NOT NULL;
