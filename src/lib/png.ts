import html2canvas from 'html2canvas';
import { Job, Settings } from './supabase';
import { formatTime, formatDate, getWorkDayHoursWithLunch } from './time';
import { EarningsSummary, PayPeriod, formatMoney, formatPeriodLabel } from './earnings';
import { payPeriodHoursTrackerFilename } from './export-filename';
import { ALBERTA_NET_DISCLAIMER, estimateAlbertaEmploymentNet } from './canada-alberta-estimate';

const JD_GREEN = '#367C2B';
const JD_YELLOW = '#FFDE00';

function renderShell(title: string, subtitle: string, bodyHTML: string): string {
  return `
    <div style="font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 0; width: 800px;">
      <div style="background: ${JD_GREEN}; color: #fff; padding: 18px 24px;">
        <div style="font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">CONSALTY</div>
        <div style="font-size: 11px; opacity: 0.9; margin-top: 2px;">Job Tracking Report</div>
      </div>
      <div style="background: ${JD_YELLOW}; height: 4px;"></div>
      <div style="padding: 24px;">
        <div style="font-size: 18px; font-weight: 700; color: #1a1a1a;">${title}</div>
        <div style="font-size: 11px; color: #5a5a5a; margin-top: 4px;">${subtitle}</div>
        <div style="margin-top: 20px;">${bodyHTML}</div>
      </div>
      <div style="border-top: 2px solid ${JD_GREEN}; padding: 12px 24px; display: flex; justify-content: space-between; font-size: 10px; color: #5a5a5a;">
        <span>Generated ${new Date().toLocaleDateString()}</span>
        <span style="font-weight: 600; color: ${JD_GREEN};">Consalty</span>
      </div>
    </div>
  `;
}

function jobsTable(jobs: Job[]): string {
  if (jobs.length === 0) {
    return `<div style="padding: 24px; text-align: center; color: #777; background: #f5f5f5; border-radius: 8px;">No jobs logged for this period.</div>`;
  }
  const rows = jobs
    .map(
      (j, i) => `
      <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f1f8ee'};">
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e5e5;">${formatDate(j.job_date)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e5e5;">${formatTime(j.start_time)} – ${formatTime(j.end_time)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600;">${Number(j.hours_worked).toFixed(2)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e5e5;">${escapeHtml(j.site || '')}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e5e5;">${escapeHtml(j.activity || '')}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e5e5; color: #555;">${escapeHtml(j.notes || '')}</td>
      </tr>
    `,
    )
    .join('');
  const total = jobs.reduce((s, j) => s + Number(j.hours_worked || 0), 0);
  return `
    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
      <thead>
        <tr style="background: ${JD_GREEN}; color: #fff;">
          <th style="padding: 10px; text-align: left;">Date</th>
          <th style="padding: 10px; text-align: left;">Time</th>
          <th style="padding: 10px; text-align: right;">Hours</th>
          <th style="padding: 10px; text-align: left;">Site</th>
          <th style="padding: 10px; text-align: left;">Activity</th>
          <th style="padding: 10px; text-align: left;">Notes</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background: ${JD_YELLOW}; font-weight: 700;">
          <td style="padding: 10px;" colspan="2">TOTAL</td>
          <td style="padding: 10px; text-align: right;">${total.toFixed(2)}</td>
          <td style="padding: 10px;" colspan="3"></td>
        </tr>
      </tfoot>
    </table>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function htmlToPngBlob(html: string): Promise<Blob> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    });
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not create PNG'))),
        'image/png',
      );
    });
  } finally {
    document.body.removeChild(container);
  }
}

async function renderAndDownload(html: string, filename: string) {
  const blob = await htmlToPngBlob(html);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function dayWorkSummaryLine(dayStartIso: string, dayEndIso: string): string {
  const { hours, lunchDeducted } = getWorkDayHoursWithLunch(dayStartIso, dayEndIso);
  const foot = lunchDeducted
    ? '<div style="margin-top:8px; font-size: 11px; color: #3d3d3d; line-height:1.35;">0.5 hr (30 min) unpaid lunch subtracted from clock time (shifts over 6 hr).</div>'
    : '<div style="margin-top:8px; font-size: 11px; color: #5a5a5a; line-height:1.35;">Shifts over 6 hr: 0.5 hr unpaid lunch is subtracted from clock time in the total above.</div>';
  return `<div style="background: #f1f8ee; border: 1px solid #367C2B; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 12px; color: #1a1a1a;">
    <strong style="color: #367C2B;">Work day</strong>
    &nbsp; ${formatTime(dayStartIso)} – ${formatTime(dayEndIso)}
    &nbsp; <span style="font-weight: 700; color: #367C2B;">${hours.toFixed(2)} hrs</span>
    ${foot}
  </div>`;
}

export async function dailyWorkReportPngBlob(
  date: string,
  dayStartIso: string,
  dayEndIso: string,
  jobs: Job[],
): Promise<Blob> {
  const body = dayWorkSummaryLine(dayStartIso, dayEndIso) + jobsTable(jobs);
  const html = renderShell(
    `Daily Work Report – ${formatDate(date)}`,
    `${jobs.length} line${jobs.length === 1 ? '' : 's'}`,
    body,
  );
  return htmlToPngBlob(html);
}

export async function generateDailyPNG(date: string, jobs: Job[]) {
  const html = renderShell(
    `Daily Report – ${formatDate(date)}`,
    `${jobs.length} job${jobs.length === 1 ? '' : 's'}`,
    jobsTable(jobs),
  );
  await renderAndDownload(html, `landscape-log-daily-${date}.png`);
}

export async function generateWeeklyPNG(start: string, end: string, jobs: Job[]) {
  const html = renderShell(
    'Weekly Report',
    `${formatDate(start)} – ${formatDate(end)}`,
    jobsTable(jobs),
  );
  await renderAndDownload(html, `landscape-log-weekly-${start}.png`);
}

export async function generateMonthlyPNG(year: number, month: number, jobs: Job[]) {
  const monthName = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const html = renderShell(
    `Monthly Report – ${monthName}`,
    `${jobs.length} job${jobs.length === 1 ? '' : 's'}`,
    jobsTable(jobs),
  );
  await renderAndDownload(
    html,
    `landscape-log-monthly-${year}-${String(month + 1).padStart(2, '0')}.png`,
  );
}

function buildPayPeriodAlbertaNetHtml(earnings: EarningsSummary, settings: Settings): string {
  const currency = settings.currency_symbol;
  const payLen = settings.pay_period_length_days;
  if (earnings.totalPay <= 0) {
    return `<div style="font-size: 12px; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 18px;">Log pay in this period to see an Alberta net estimate.</div>`;
  }
  const ab = estimateAlbertaEmploymentNet(earnings.totalPay, payLen);
  const disc = `${ALBERTA_NET_DISCLAIMER} Varies with RRSP, dependents, other income, and actual payroll settings.`;
  return `
  <div style="border: 2px solid #e2e8f0; border-radius: 12px; background: linear-gradient(to bottom, #f8fafc, #fff); margin-bottom: 18px; overflow: hidden;">
    <div style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0; padding: 12px 14px;">
      <div style="font-size: 14px; font-weight: 700; color: #0f172a;">Estimated take-home (Alberta)</div>
      <div style="font-size: 10px; color: #475569; margin-top: 6px; line-height: 1.45;">Gross for this pay period is annualized (× 365 / ${payLen} days) and run through 2025 federal and Alberta tax brackets, basic personal credits, plus CPP and EI—similar to a salaried paycheque, not a contractor invoice.</div>
    </div>
    <div style="padding: 16px 14px 12px;">
      <div style="font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #64748b;">Est. net (this pay period)</div>
      <div style="font-size: 28px; font-weight: 700; color: ${JD_GREEN}; margin-top: 4px;">${formatMoney(ab.periodNet, currency)}</div>
      <div style="font-size: 10px; color: #64748b; margin-top: 4px; line-height: 1.35;">After about ${(ab.effectiveTotalRate * 100).toFixed(1)}% in tax + CPP + EI; annualized gross ≈ ${formatMoney(ab.annualGross, currency)}/yr</div>
      <div style="display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; margin-top: 12px;">
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
          <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em;">Federal</div>
          <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 4px;">${formatMoney(ab.periodFederalTax, currency)}</div>
        </div>
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
          <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em;">Alberta</div>
          <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 4px;">${formatMoney(ab.periodAbTax, currency)}</div>
        </div>
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
          <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em;">CPP</div>
          <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 4px;">${formatMoney(ab.periodCpp, currency)}</div>
        </div>
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
          <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em;">EI</div>
          <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 4px;">${formatMoney(ab.periodEi, currency)}</div>
        </div>
      </div>
    </div>
    <p style="font-size: 10px; color: #64748b; line-height: 1.45; border-top: 1px solid #e2e8f0; margin: 0; padding: 12px 14px;">${disc}</p>
  </div>`;
}

export async function generatePayPeriodPNG(
  period: PayPeriod,
  earnings: EarningsSummary,
  settings: Settings,
) {
  const currency = settings.currency_symbol;
  const rate = Number(settings.hourly_rate);
  const otMultiplier = Number(settings.overtime_multiplier);
  const summaryTable = `
    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px;">
      <thead>
        <tr style="background: ${JD_GREEN}; color: #fff;">
          <th style="padding: 10px; text-align: left;"></th>
          <th style="padding: 10px; text-align: right;">Hours</th>
          <th style="padding: 10px; text-align: right;">Rate</th>
          <th style="padding: 10px; text-align: right;">Pay</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background: #fff;">
          <td style="padding: 8px 10px; border-bottom: 1px solid #e5e5e5;">Regular</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e5e5;">${earnings.regularHours.toFixed(2)}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e5e5;">${formatMoney(rate, currency)}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e5e5;">${formatMoney(earnings.regularPay, currency)}</td>
        </tr>
        <tr style="background: #f1f8ee;">
          <td style="padding: 8px 10px; border-bottom: 1px solid #e5e5e5;">Overtime</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e5e5;">${earnings.overtimeHours.toFixed(2)}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e5e5;">${formatMoney(rate * otMultiplier, currency)}</td>
          <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e5e5;">${formatMoney(earnings.overtimePay, currency)}</td>
        </tr>
        <tr style="background: ${JD_YELLOW}; font-weight: 700;">
          <td style="padding: 10px;">TOTAL</td>
          <td style="padding: 10px; text-align: right;">${earnings.totalHours.toFixed(2)}</td>
          <td style="padding: 10px;"></td>
          <td style="padding: 10px; text-align: right;">${formatMoney(earnings.totalPay, currency)}</td>
        </tr>
      </tbody>
    </table>
  `;

  const weeklyRows = earnings.weeks
    .map(
      (w, i) => `
      <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f1f8ee'};">
        <td style="padding: 8px 10px; border-bottom: 1px solid #e5e5e5;">${w.weekStart.toLocaleDateString()} – ${w.weekEnd.toLocaleDateString()}</td>
        <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e5e5;">${w.totalHours.toFixed(2)}</td>
        <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e5e5;">${w.regularHours.toFixed(2)}</td>
        <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e5e5; color: ${w.overtimeHours > 0 ? '#b36b00' : '#333'};">${w.overtimeHours.toFixed(2)}</td>
        <td style="padding: 8px 10px; text-align: right; border-bottom: 1px solid #e5e5e5; font-weight: 600;">${formatMoney(w.regularPay + w.overtimePay, currency)}</td>
      </tr>
    `,
    )
    .join('');

  const weeklyTable = `
    <div style="font-size: 13px; font-weight: 700; color: ${JD_GREEN}; margin-bottom: 6px;">Weekly Breakdown</div>
    <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 18px;">
      <thead>
        <tr style="background: ${JD_GREEN}; color: #fff;">
          <th style="padding: 10px; text-align: left;">Week</th>
          <th style="padding: 10px; text-align: right;">Total Hrs</th>
          <th style="padding: 10px; text-align: right;">Regular</th>
          <th style="padding: 10px; text-align: right;">Overtime</th>
          <th style="padding: 10px; text-align: right;">Pay</th>
        </tr>
      </thead>
      <tbody>${weeklyRows}</tbody>
    </table>
  `;

  const allJobs = earnings.weeks
    .flatMap((w) => w.jobs)
    .sort((a, b) => {
      if (a.job_date !== b.job_date) return a.job_date.localeCompare(b.job_date);
      return a.start_time.localeCompare(b.start_time);
    });

  const albertaHtml = buildPayPeriodAlbertaNetHtml(earnings, settings);

  const body = `
    <div style="font-size: 10px; color: #5a5a5a; margin-bottom: 14px;">
      Rate: ${formatMoney(rate, currency)}/hr &nbsp;|&nbsp; OT: Mon–Fri after 8 hrs/day, Sat after 4 hrs/day, Sun all hrs @ ${otMultiplier.toFixed(2)}x (${formatMoney(rate * otMultiplier, currency)}/hr)
    </div>
    ${summaryTable}
    ${albertaHtml}
    ${weeklyTable}
    ${allJobs.length > 0 ? `<div style="font-size: 13px; font-weight: 700; color: ${JD_GREEN}; margin-bottom: 6px;">Job Log</div>${jobsTable(allJobs)}` : ''}
  `;

  const html = renderShell('Pay Period Report', formatPeriodLabel(period), body);
  await renderAndDownload(
    html,
    payPeriodHoursTrackerFilename(settings, period, 'png'),
  );
}
