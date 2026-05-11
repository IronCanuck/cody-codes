/*
  # Allow FLHAs to be created before a job row exists + scope by company

  On the Consalty Log page, task blocks aren't persisted as `jobs` rows until the
  user submits the daily report. To let users fill out a Field Level Hazard
  Assessment before starting the work, decouple `flhas.job_id` and introduce a
  stable client-side `client_task_key` that ties an FLHA to a draft task block.

  Also adds `company_id` so FLHAs (including standalone ones with no job yet)
  belong to a Consalty company profile, matching `jobs`/`settings`/etc.

  Changes:
  - `flhas.job_id` becomes nullable; the unique index is replaced by a partial
    unique index so multiple drafts can have `NULL` job_id but each saved job
    still has at most one FLHA.
  - New nullable `client_task_key` text column with a partial unique index so a
    given draft task block has at most one FLHA.
  - New nullable `company_id` referencing `companies(id) ON DELETE CASCADE`.
    Existing FLHA rows are backfilled from their parent job's company_id.
  - Helpful indexes on `client_task_key` and `company_id` for lookup.
*/

ALTER TABLE flhas
  ALTER COLUMN job_id DROP NOT NULL;

ALTER TABLE flhas
  ADD COLUMN IF NOT EXISTS client_task_key text;

ALTER TABLE flhas
  ADD COLUMN IF NOT EXISTS company_id uuid
  REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE flhas
  DROP CONSTRAINT IF EXISTS flhas_job_id_unique;

CREATE UNIQUE INDEX IF NOT EXISTS flhas_job_id_unique_not_null
  ON flhas (job_id)
  WHERE job_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS flhas_client_task_key_unique_not_null
  ON flhas (client_task_key)
  WHERE client_task_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_flhas_client_task_key ON flhas(client_task_key);
CREATE INDEX IF NOT EXISTS idx_flhas_company_id ON flhas(company_id);

-- Backfill company_id for existing FLHAs that have a job
UPDATE flhas f
SET company_id = j.company_id
FROM jobs j
WHERE f.job_id = j.id AND f.company_id IS NULL;
