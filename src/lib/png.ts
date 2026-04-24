import html2canvas from 'html2canvas';
import { Job, Settings } from './supabase';
import { formatTime, formatDate } from './time';
import { EarningsSummary, PayPeriod, formatMoney, formatPeriodLabel } from './earnings';

const JD_GREEN = '#367C2B';
const JD_YELLOW = '#FFDE00';

function renderShell(title: string, subtitle: string, bodyHTML: string): string {
  return `
    <div style="font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 0; width: 800px;">
      <div style="background: ${JD_GREEN}; color: #fff; padding: 18px 24px;">
        <div style="font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">LANDSCAPE LOG</div>
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
        <span style="font-weight: 600; color: ${JD_GREEN};">Landscape Log</span>
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

async function renderAndDownload(html: string, filename: string) {
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
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  } finally {
    document.body.removeChild(container);
  }
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

export async function generatePayPeriodPNG(
  period: PayPeriod,
  earnings: EarningsSummary,
  settings: Settings,
) {
  const currency = settings.currency_symbol;
  const rate = Number(settings.hourly_rate);
  const otMultiplier = Number(settings.overtime_multiplier);
  const threshold = Number(settings.overtime_threshold_hours);

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

  const body = `
    <div style="font-size: 10px; color: #5a5a5a; margin-bottom: 14px;">
      Rate: ${formatMoney(rate, currency)}/hr &nbsp;|&nbsp; OT after ${threshold} hrs/wk @ ${otMultiplier.toFixed(2)}x (${formatMoney(rate * otMultiplier, currency)}/hr)
    </div>
    ${summaryTable}
    ${weeklyTable}
    ${allJobs.length > 0 ? `<div style="font-size: 13px; font-weight: 700; color: ${JD_GREEN}; margin-bottom: 6px;">Job Log</div>${jobsTable(allJobs)}` : ''}
  `;

  const html = renderShell('Pay Period Report', formatPeriodLabel(period), body);
  const startStr = period.start.toISOString().slice(0, 10);
  await renderAndDownload(html, `landscape-log-payperiod-${startStr}.png`);
}
