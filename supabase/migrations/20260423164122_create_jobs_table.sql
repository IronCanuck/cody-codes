/*
  # Create jobs table for landscaping job tracker

  1. New Tables
    - `jobs`
      - `id` (uuid, primary key)
      - `job_date` (date) - the date of the work
      - `start_time` (timestamptz) - when the job started
      - `end_time` (timestamptz) - when the job finished
      - `hours_worked` (numeric) - hours computed from start/end
      - `activity` (text) - description of work activity completed
      - `site` (text) - optional site/location name
      - `notes` (text) - optional additional notes
      - `created_at` (timestamptz) - record creation timestamp

  2. Security
    - Enable RLS on `jobs` table
    - Since this is a single-user app with no authentication, policies
      permit anonymous access for full CRUD operations. This is
      explicitly requested by the user ("no login required").
*/

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  hours_worked numeric(6,2) NOT NULL DEFAULT 0,
  activity text NOT NULL DEFAULT '',
  site text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can view all jobs"
  ON jobs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert jobs"
  ON jobs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update jobs"
  ON jobs FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete jobs"
  ON jobs FOR DELETE
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_jobs_job_date ON jobs(job_date DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
