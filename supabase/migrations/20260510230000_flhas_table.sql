/*
  # Create flhas table for Consalty (Field Level Hazard Assessments)

  Each job entry can have one Field Level Hazard Assessment (FLHA). The form is
  filled out before starting the task and lists identified hazards, the controls
  applied, required PPE, and a worker/supervisor signoff.

  1. New Tables
    - `flhas`
      - `id` (uuid, primary key)
      - `job_id` (uuid, references `jobs.id`, unique) — one FLHA per job/task
      - `assessment_date` (date)
      - `location` (text) — site/location for the task
      - `task_description` (text) — what work is being performed
      - `hazards` (jsonb) — array of `{description, risk_level, controls}`
      - `ppe_required` (text[]) — checked PPE items
      - `additional_notes` (text)
      - `worker_name` (text)
      - `supervisor_name` (text)
      - `signed_at` (timestamptz, nullable) — when worker signed off
      - `created_at`, `updated_at` (timestamptz)

  2. Security
    - Enable RLS, authenticated-only access (matches jobs/settings policy).
    - Deleting the parent job cascades the FLHA row.
*/

CREATE TABLE IF NOT EXISTS flhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  location text NOT NULL DEFAULT '',
  task_description text NOT NULL DEFAULT '',
  hazards jsonb NOT NULL DEFAULT '[]'::jsonb,
  ppe_required text[] NOT NULL DEFAULT ARRAY[]::text[],
  additional_notes text NOT NULL DEFAULT '',
  worker_name text NOT NULL DEFAULT '',
  supervisor_name text NOT NULL DEFAULT '',
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flhas_job_id_unique UNIQUE (job_id)
);

ALTER TABLE flhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select flhas"
  ON flhas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert flhas"
  ON flhas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update flhas"
  ON flhas FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete flhas"
  ON flhas FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_flhas_job_id ON flhas(job_id);
CREATE INDEX IF NOT EXISTS idx_flhas_assessment_date ON flhas(assessment_date DESC);
