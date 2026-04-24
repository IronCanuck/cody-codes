/*
  # Create settings table for wage and pay period configuration

  1. New Tables
    - `settings`
      - `id` (uuid, primary key) - always a single row expected
      - `hourly_rate` (numeric) - base hourly wage
      - `overtime_multiplier` (numeric) - multiplier for overtime hours (default 1.5)
      - `overtime_threshold_hours` (numeric) - weekly hours before overtime kicks in (default 40)
      - `pay_period_length_days` (int) - default 14 for bi-weekly
      - `pay_period_anchor_date` (date) - a known start date of a pay period
      - `currency_symbol` (text) - default '$'
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS with anonymous CRUD to match existing single-user pattern
*/

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hourly_rate numeric(10,2) NOT NULL DEFAULT 25.00,
  overtime_multiplier numeric(4,2) NOT NULL DEFAULT 1.5,
  overtime_threshold_hours numeric(5,2) NOT NULL DEFAULT 40,
  pay_period_length_days int NOT NULL DEFAULT 14,
  pay_period_anchor_date date NOT NULL DEFAULT CURRENT_DATE,
  currency_symbol text NOT NULL DEFAULT '$',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can view settings"
  ON settings FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert settings"
  ON settings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update settings"
  ON settings FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete settings"
  ON settings FOR DELETE
  TO anon
  USING (true);
