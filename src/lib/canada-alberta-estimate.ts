/**
 * Approximate take-home (net) for Alberta employment income.
 * Annualizes the current pay period gross, applies 2025 federal + AB annual brackets, CPP, EI.
 * Not tax advice; actual payroll uses TD1, per-pay pro-ration, and YTD.
 */

const DAYS_PER_YEAR = 365;

/** 2025 indexation: federal (CRA). */
const FED_BPA = 16_129;
/** Alberta non-refundable BPA (aligned with common payroll tables for AB). */
const AB_BPA = 16_129;

const FED_BRACKETS: { to: number; rate: number }[] = [
  { to: 57_375, rate: 0.15 },
  { to: 114_750, rate: 0.205 },
  { to: 177_882, rate: 0.26 },
  { to: 253_414, rate: 0.29 },
  { to: Number.POSITIVE_INFINITY, rate: 0.33 },
];

const AB_BRACKETS: { to: number; rate: number }[] = [
  { to: 60_000, rate: 0.08 },
  { to: 151_234, rate: 0.1 },
  { to: 181_481, rate: 0.12 },
  { to: 241_974, rate: 0.13 },
  { to: 362_961, rate: 0.14 },
  { to: Number.POSITIVE_INFINITY, rate: 0.15 },
];

const YMPE_2025 = 71_300;
const YAMPE_2025 = 81_200;
const CPP1_RATE = 0.0595;
const CPP_BASIC_EXEMPTION = 3_500;
const CPP2_RATE = 0.04;
const MIE_2025 = 65_700;
const EI_RATE_2025 = 0.0164;

function progressiveTax(annual: number, brackets: { to: number; rate: number }[]): number {
  if (annual <= 0) return 0;
  let tax = 0;
  let previous = 0;
  for (const b of brackets) {
    if (annual <= previous) break;
    if (!Number.isFinite(b.to)) {
      tax += (annual - previous) * b.rate;
      break;
    }
    const inBracket = Math.min(annual, b.to) - previous;
    if (inBracket > 0) tax += inBracket * b.rate;
    previous = b.to;
  }
  return tax;
}

function annualCpp1(employmentIncome: number): number {
  if (employmentIncome <= 0) return 0;
  const pe = Math.min(employmentIncome, YMPE_2025);
  if (pe <= CPP_BASIC_EXEMPTION) return 0;
  return CPP1_RATE * (pe - CPP_BASIC_EXEMPTION);
}

function annualCpp2(employmentIncome: number): number {
  if (employmentIncome <= YMPE_2025) return 0;
  const inLayer = Math.min(employmentIncome, YAMPE_2025) - YMPE_2025;
  if (inLayer <= 0) return 0;
  return CPP2_RATE * inLayer;
}

function annualEi(employmentIncome: number): number {
  if (employmentIncome <= 0) return 0;
  const insurable = Math.min(employmentIncome, MIE_2025);
  return EI_RATE_2025 * insurable;
}

export type AlbertaNetEstimate = {
  /** Pay-period gross (same as app total pay). */
  periodGross: number;
  /** Annualized gross if this pay period’s pace held all year. */
  annualGross: number;
  periodFederalTax: number;
  periodAbTax: number;
  periodCpp: number;
  periodEi: number;
  periodTotalDeductions: number;
  periodNet: number;
  effectiveTotalRate: number;
};

/**
 * @param payPeriodGross - Gross for this pay period
 * @param payPeriodLengthDays - Settings pay_period_length_days
 */
export function estimateAlbertaEmploymentNet(
  payPeriodGross: number,
  payPeriodLengthDays: number,
): AlbertaNetEstimate {
  const len = Math.max(1, payPeriodLengthDays);
  const annualGross = (payPeriodGross * DAYS_PER_YEAR) / len;

  const federalBeforeCredits = progressiveTax(annualGross, FED_BRACKETS);
  const federalAfterCredits = Math.max(0, federalBeforeCredits - FED_BPA * 0.15);

  const abBeforeCredits = progressiveTax(annualGross, AB_BRACKETS);
  const abAfterCredits = Math.max(0, abBeforeCredits - AB_BPA * 0.08);

  const cpp1 = annualCpp1(annualGross);
  const cpp2 = annualCpp2(annualGross);
  const ei = annualEi(annualGross);
  const annualTotalDeductions = federalAfterCredits + abAfterCredits + cpp1 + cpp2 + ei;

  const f = len / DAYS_PER_YEAR;

  const periodFederalTax = federalAfterCredits * f;
  const periodAbTax = abAfterCredits * f;
  const periodCpp = (cpp1 + cpp2) * f;
  const periodEi = ei * f;
  const periodTotalDeductions = annualTotalDeductions * f;
  const periodNet = Math.max(0, payPeriodGross - periodTotalDeductions);
  const effectiveTotalRate = payPeriodGross > 0 ? periodTotalDeductions / payPeriodGross : 0;

  return {
    periodGross: payPeriodGross,
    annualGross,
    periodFederalTax,
    periodAbTax,
    periodCpp,
    periodEi,
    periodTotalDeductions,
    periodNet,
    effectiveTotalRate,
  };
}

/** Subtract Settings “extra tax per pay period” after CPP/EI/tax estimate; does not change gross annualization. */
export function netAfterExtraPayPeriodTax(periodNet: number, extraTaxPerPeriod: number): number {
  const extra = Math.max(0, Number(extraTaxPerPeriod) || 0);
  return Math.max(0, periodNet - extra);
}

export const ALBERTA_NET_DISCLAIMER =
  'Illustration only. Uses 2025 federal/Alberta brackets, CPP, and EI on annualized pay. Not tax, payroll, or legal advice.';
