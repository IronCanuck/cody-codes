import { useMemo } from 'react';
import { Landmark } from 'lucide-react';
import { Job, Settings, SavedDailyReport } from '../lib/supabase';
import {
  estimateAlbertaEmploymentNet,
  netAfterExtraPayPeriodTax,
  ALBERTA_NET_DISCLAIMER,
} from '../lib/canada-alberta-estimate';
import {
  computeEarnings,
  formatMoney,
  getPayPeriodForDate,
} from '../lib/earnings';

type Props = {
  jobs: Job[];
  settings: Settings;
  dailyReports?: SavedDailyReport[];
};

export function NetTakeHomeCard({ jobs, settings, dailyReports = [] }: Props) {
  const period = useMemo(() => getPayPeriodForDate(new Date(), settings), [settings]);

  const earnings = useMemo(
    () => computeEarnings(jobs, period, settings, dailyReports),
    [jobs, period, settings, dailyReports],
  );

  const currency = settings.currency_symbol;

  const abNet = useMemo(
    () => estimateAlbertaEmploymentNet(earnings.totalPay, settings.pay_period_length_days),
    [earnings.totalPay, settings.pay_period_length_days],
  );

  const extraTaxPerPeriod = Math.max(0, Number(settings.extra_tax_per_pay_period) || 0);
  const projectedNet = useMemo(
    () => netAfterExtraPayPeriodTax(abNet.periodNet, settings.extra_tax_per_pay_period),
    [abNet.periodNet, settings.extra_tax_per_pay_period],
  );

  return (
    <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/80 flex items-start gap-3">
        <div className="rounded-lg p-2 bg-slate-200/80 text-slate-800 shrink-0">
          <Landmark size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Estimated take-home (Alberta)</h3>
          <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
            Gross for this pay period is annualized (× 365 / {settings.pay_period_length_days}{' '}
            days) and run through 2025 federal and Alberta tax brackets, basic personal credits,
            plus CPP and EI—similar to a salaried paycheque, not a contractor invoice.
          </p>
        </div>
      </div>
      {earnings.totalPay > 0 ? (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Est. net (this pay period)
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-jd-green-700 tabular-nums">
                {formatMoney(projectedNet, currency)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                After about {(abNet.effectiveTotalRate * 100).toFixed(1)}% in tax + CPP + EI;
                annualized gross ≈ {formatMoney(abNet.annualGross, currency)}/yr
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 text-sm">
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">
                Federal
              </div>
              <div className="font-semibold text-slate-800 tabular-nums">
                {formatMoney(abNet.periodFederalTax, currency)}
              </div>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">
                Alberta
              </div>
              <div className="font-semibold text-slate-800 tabular-nums">
                {formatMoney(abNet.periodAbTax, currency)}
              </div>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">
                CPP
              </div>
              <div className="font-semibold text-slate-800 tabular-nums">
                {formatMoney(abNet.periodCpp, currency)}
              </div>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">
                EI
              </div>
              <div className="font-semibold text-slate-800 tabular-nums">
                {formatMoney(abNet.periodEi, currency)}
              </div>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 p-3 sm:col-span-2 lg:col-span-1">
              <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">
                Extra withholding
              </div>
              <div className="font-semibold text-slate-800 tabular-nums">
                {extraTaxPerPeriod > 0 ? formatMoney(extraTaxPerPeriod, currency) : '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                Per pay period · Settings
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200 pt-3">
            {ALBERTA_NET_DISCLAIMER} Varies with RRSP, dependents, other income, and actual payroll
            settings.
          </p>
        </div>
      ) : (
        <p className="p-4 text-sm text-slate-500">
          Log pay in this period to see a net estimate.
        </p>
      )}
    </div>
  );
}
