-- Extra withholding per pay period (Alberta net estimate adjustment on Earnings)
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS extra_tax_per_pay_period numeric(10,2) NOT NULL DEFAULT 150.00;
