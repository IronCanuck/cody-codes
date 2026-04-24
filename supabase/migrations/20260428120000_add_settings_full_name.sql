-- Display name for export filenames (Earnings pay-period PDF/PNG)
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS full_name text NOT NULL DEFAULT '';
