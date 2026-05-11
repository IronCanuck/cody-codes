import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Job, Settings, Flha } from './supabase';
import { formatTime, formatDate, getWorkDayHoursWithLunchAnchored } from './time';
import { EarningsSummary, PayPeriod, formatMoney, formatPeriodLabel } from './earnings';
import { payPeriodHoursTrackerFilename, reportEmployeeLabel } from './export-filename';
import {
  ALBERTA_NET_DISCLAIMER,
  estimateAlbertaEmploymentNet,
  netAfterExtraPayPeriodTax,
} from './canada-alberta-estimate';

const JD_GREEN: [number, number, number] = [54, 124, 43];
const JD_YELLOW: [number, number, number] = [255, 222, 0];
const TEXT_DARK: [number, number, number] = [26, 26, 26];

function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(...JD_GREEN);
  doc.rect(0, 0, pageW, 28, 'F');

  doc.setFillColor(...JD_YELLOW);
  doc.rect(0, 28, pageW, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('CONSALTY', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Job Tracking Report', 14, 22);

  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 14, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(subtitle, 14, 51);

  doc.setTextColor(...TEXT_DARK);
}

/** Green-band header: employee name + pay period; document title in the white area below. */
function drawPayPeriodHeader(
  doc: jsPDF,
  settings: Settings,
  period: PayPeriod,
  title: string,
  contentSubtitle: string,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const m = 14;
  const name = reportEmployeeLabel(settings);
  const periodLabel = formatPeriodLabel(period);

  doc.setFillColor(...JD_GREEN);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFillColor(...JD_YELLOW);
  doc.rect(0, 28, pageW, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  const maxW = pageW - 2 * m;
  let nameSize = 20;
  doc.setFontSize(nameSize);
  let nameLines = doc.splitTextToSize(name, maxW);
  while (nameLines.length > 2 && nameSize > 11) {
    nameSize -= 0.5;
    doc.setFontSize(nameSize);
    nameLines = doc.splitTextToSize(name, maxW);
  }
  if (nameLines.length > 2) {
    nameLines = [nameLines[0]!, `${(nameLines[1] ?? '').replace(/[.…]+$/, '')}…`];
  } else {
    nameLines = nameLines.slice(0, 2);
  }
  doc.setFontSize(nameSize);
  if (nameLines.length === 1) {
    doc.text(nameLines[0]!, m, 14);
  } else {
    doc.text(nameLines[0]!, m, 12);
    doc.text(nameLines[1]!, m, 20);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(periodLabel, m, 26);

  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, m, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(contentSubtitle, m, 51);

  doc.setTextColor(...TEXT_DARK);
}

function drawFooter(doc: jsPDF, totalHours: number) {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...JD_GREEN);
    doc.setLineWidth(0.5);
    doc.line(14, pageH - 16, pageW - 14, pageH - 16);

    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      14,
      pageH - 10,
    );
    doc.text(`Page ${i} of ${pageCount}`, pageW - 14, pageH - 10, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...JD_GREEN);
    doc.text(`Total Hours: ${totalHours.toFixed(2)}`, pageW / 2, pageH - 10, {
      align: 'center',
    });
  }
}

function buildTable(doc: jsPDF, jobs: Job[], startY: number) {
  const body = jobs.map((j) => [
    formatDate(j.job_date),
    formatTime(j.start_time),
    formatTime(j.end_time),
    j.hours_worked.toFixed(2),
    j.site || '-',
    j.activity || '-',
  ]);

  autoTable(doc, {
    startY,
    head: [['Date', 'Start', 'End', 'Hours', 'Site', 'Activity']],
    body,
    theme: 'grid',
    headStyles: {
      fillColor: JD_GREEN,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: TEXT_DARK,
    },
    alternateRowStyles: {
      fillColor: [241, 248, 238],
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 18 },
      2: { cellWidth: 18 },
      3: { cellWidth: 16, halign: 'right' },
      4: { cellWidth: 32 },
      5: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14, bottom: 22 },
  });
}

function sumHours(jobs: Job[]): number {
  return jobs.reduce((sum, j) => sum + Number(j.hours_worked || 0), 0);
}

export function generateDailyPDF(date: string, jobs: Job[]) {
  const doc = new jsPDF();
  drawHeader(doc, 'Daily Report', formatDate(date));

  if (jobs.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text('No jobs logged for this day.', 14, 70);
  } else {
    buildTable(doc, jobs, 60);
  }

  drawFooter(doc, sumHours(jobs));
  doc.save(`landscape-log-daily-${date}.pdf`);
}

/** PDF for a single work day with overall times plus per-task rows (used for submit + storage). */
export function buildDailyWorkReportPdf(
  date: string,
  dayStartIso: string,
  dayEndIso: string,
  jobs: Job[],
): jsPDF {
  const doc = new jsPDF();
  drawHeader(doc, 'Daily Work Report', formatDate(date));

  const { hours: dayHrs, lunchDeducted } = getWorkDayHoursWithLunchAnchored(
    date,
    dayStartIso,
    dayEndIso,
  );
  const lunchNote = lunchDeducted ? ' — 30 min unpaid lunch deducted' : '';
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Work day: ${formatTime(dayStartIso)} – ${formatTime(dayEndIso)} (${dayHrs.toFixed(2)} hrs)${lunchNote}`,
    14,
    58,
  );

  if (jobs.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text('No tasks recorded.', 14, 72);
  } else {
    buildTable(doc, jobs, 66);
  }

  drawFooter(doc, sumHours(jobs));
  return doc;
}

export function dailyWorkReportPdfBlob(
  date: string,
  dayStartIso: string,
  dayEndIso: string,
  jobs: Job[],
): Blob {
  const doc = buildDailyWorkReportPdf(date, dayStartIso, dayEndIso, jobs);
  return doc.output('blob');
}

export function downloadDailyWorkReportPdf(
  date: string,
  dayStartIso: string,
  dayEndIso: string,
  jobs: Job[],
) {
  const doc = buildDailyWorkReportPdf(date, dayStartIso, dayEndIso, jobs);
  doc.save(`landscape-log-daily-${date}.pdf`);
}

/**
 * Sanitize an arbitrary string into a filesystem-friendly slug. Used to compose
 * FLHA filenames like `flha-2026-05-10-bobcat-site.pdf`.
 */
function slugifyForFilename(input: string, max = 40): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);
  return cleaned || 'task';
}

const RISK_LABEL: Record<Flha['hazards'][number]['risk_level'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/**
 * Build a PDF for a single Field Level Hazard Assessment suitable for sending to
 * the front office. Includes header info, task description, hazards/controls
 * table, PPE list, additional notes, and sign-off lines.
 */
export function buildFlhaPdf(flha: Flha, companyName?: string | null): jsPDF {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const m = 14;

  drawHeader(
    doc,
    'Field Level Hazard Assessment',
    `${formatDate(flha.assessment_date)}${companyName ? ` · ${companyName}` : ''}`,
  );

  // Meta block (label / value pairs)
  const meta: [string, string][] = [
    ['Date', formatDate(flha.assessment_date)],
    ['Location', flha.location || '-'],
    ['Worker', flha.worker_name || '-'],
    ['Supervisor', flha.supervisor_name || '-'],
  ];
  if (companyName) meta.unshift(['Company', companyName]);

  autoTable(doc, {
    startY: 60,
    head: [],
    body: meta,
    theme: 'plain',
    styles: { fontSize: 10, textColor: TEXT_DARK, cellPadding: { top: 1.2, bottom: 1.2, left: 0, right: 4 } },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: m, right: m },
  });

  type AutoTableDoc = jsPDF & { lastAutoTable?: { finalY: number } };
  let cursorY = (doc as AutoTableDoc).lastAutoTable?.finalY ?? 90;
  cursorY += 6;

  // Task description
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...JD_GREEN);
  doc.text('Task description', m, cursorY);
  cursorY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  const descLines = doc.splitTextToSize(flha.task_description || '-', pageW - 2 * m);
  doc.text(descLines, m, cursorY);
  cursorY += descLines.length * 5 + 4;

  // Hazards table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...JD_GREEN);
  doc.text('Hazards & controls', m, cursorY);
  cursorY += 2;

  const hazardRows = (flha.hazards || []).map((h, idx) => [
    String(idx + 1),
    h.description || '-',
    RISK_LABEL[h.risk_level] || '-',
    h.controls || '-',
  ]);

  if (hazardRows.length === 0) {
    autoTable(doc, {
      startY: cursorY + 2,
      head: [['#', 'Hazard', 'Residual risk', 'Controls / mitigation']],
      body: [['-', 'No hazards listed', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: JD_GREEN, textColor: [255, 255, 255], fontSize: 10 },
      bodyStyles: { fontSize: 9, textColor: TEXT_DARK },
      alternateRowStyles: { fillColor: [241, 248, 238] },
      margin: { left: m, right: m },
    });
  } else {
    autoTable(doc, {
      startY: cursorY + 2,
      head: [['#', 'Hazard', 'Residual risk', 'Controls / mitigation']],
      body: hazardRows,
      theme: 'grid',
      headStyles: { fillColor: JD_GREEN, textColor: [255, 255, 255], fontSize: 10 },
      bodyStyles: { fontSize: 9, textColor: TEXT_DARK },
      alternateRowStyles: { fillColor: [241, 248, 238] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'right' },
        1: { cellWidth: 60 },
        2: { cellWidth: 24, halign: 'center' },
        3: { cellWidth: 'auto' },
      },
      margin: { left: m, right: m },
    });
  }

  cursorY = (doc as AutoTableDoc).lastAutoTable?.finalY ?? cursorY + 30;
  cursorY += 8;

  // Required PPE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...JD_GREEN);
  doc.text('Required PPE', m, cursorY);
  cursorY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  const ppeText =
    flha.ppe_required && flha.ppe_required.length > 0
      ? flha.ppe_required.join(' · ')
      : 'None specified';
  const ppeLines = doc.splitTextToSize(ppeText, pageW - 2 * m);
  doc.text(ppeLines, m, cursorY);
  cursorY += ppeLines.length * 5 + 4;

  // Notes
  if (flha.additional_notes && flha.additional_notes.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...JD_GREEN);
    doc.text('Additional notes', m, cursorY);
    cursorY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_DARK);
    const noteLines = doc.splitTextToSize(flha.additional_notes, pageW - 2 * m);
    doc.text(noteLines, m, cursorY);
    cursorY += noteLines.length * 5 + 6;
  }

  // Sign-off block (page-break aware)
  const pageH = doc.internal.pageSize.getHeight();
  const neededForSignoff = 40;
  if (cursorY + neededForSignoff > pageH - 22) {
    doc.addPage();
    cursorY = 20;
  } else {
    cursorY += 4;
  }

  doc.setDrawColor(...JD_GREEN);
  doc.setLineWidth(0.4);
  doc.line(m, cursorY, pageW - m, cursorY);
  cursorY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...JD_GREEN);
  doc.text('Sign-off', m, cursorY);
  cursorY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  const signedLabel = flha.signed_at
    ? `Worker confirmed at ${new Date(flha.signed_at).toLocaleString()}`
    : 'Worker confirmation: pending';
  doc.text(signedLabel, m, cursorY);
  cursorY += 12;

  const colW = (pageW - 2 * m - 10) / 2;
  doc.line(m, cursorY, m + colW, cursorY);
  doc.line(m + colW + 10, cursorY, pageW - m, cursorY);
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`Worker signature${flha.worker_name ? ` — ${flha.worker_name}` : ''}`, m, cursorY + 5);
  doc.text(
    `Supervisor signature${flha.supervisor_name ? ` — ${flha.supervisor_name}` : ''}`,
    m + colW + 10,
    cursorY + 5,
  );

  // Footer (reuse style without total-hours)
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...JD_GREEN);
    doc.setLineWidth(0.5);
    doc.line(m, pageH - 16, pageW - m, pageH - 16);
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      m,
      pageH - 10,
    );
    doc.text(`Page ${i} of ${pageCount}`, pageW - m, pageH - 10, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...JD_GREEN);
    doc.text('FLHA — Consalty', pageW / 2, pageH - 10, { align: 'center' });
  }

  return doc;
}

export function flhaPdfBlob(flha: Flha, companyName?: string | null): Blob {
  return buildFlhaPdf(flha, companyName).output('blob');
}

export function flhaPdfFilename(flha: Flha): string {
  const slug = slugifyForFilename(flha.task_description || flha.location || 'task');
  return `flha-${flha.assessment_date}-${slug}.pdf`;
}

export function downloadFlhaPdf(flha: Flha, companyName?: string | null): void {
  buildFlhaPdf(flha, companyName).save(flhaPdfFilename(flha));
}

export function generateWeeklyPDF(startDate: string, endDate: string, jobs: Job[]) {
  const doc = new jsPDF();
  drawHeader(doc, 'Weekly Report', `${formatDate(startDate)} to ${formatDate(endDate)}`);

  if (jobs.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text('No jobs logged for this week.', 14, 70);
  } else {
    buildTable(doc, jobs, 60);
  }

  drawFooter(doc, sumHours(jobs));
  doc.save(`landscape-log-weekly-${startDate}.pdf`);
}

export function generateMonthlyPDF(year: number, month: number, jobs: Job[]) {
  const doc = new jsPDF();
  const monthName = new Date(year, month, 1).toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  });
  drawHeader(doc, 'Monthly Report', monthName);

  if (jobs.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text('No jobs logged for this month.', 14, 70);
  } else {
    buildTable(doc, jobs, 60);
  }

  drawFooter(doc, sumHours(jobs));
  doc.save(`landscape-log-monthly-${year}-${String(month + 1).padStart(2, '0')}.pdf`);
}

function drawWrappedLines(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
): number {
  let yy = y;
  for (const line of lines) {
    doc.text(line, x, yy);
    yy += lineHeight;
  }
  return yy;
}

/** Alberta net estimate block (matches Earnings “Estimated take-home”). */
function drawPayPeriodAlbertaNet(
  doc: jsPDF,
  startY: number,
  settings: Settings,
  earnings: EarningsSummary,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - 28;
  const m = 14;
  const lineH = 3.8;
  let y = startY;
  const currency = settings.currency_symbol;
  const payLen = settings.pay_period_length_days;

  if (earnings.totalPay <= 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Log pay in this period to see an Alberta net estimate.', m, y);
    return y + 6;
  }

  const ab = estimateAlbertaEmploymentNet(earnings.totalPay, payLen);
  const projectedNet = netAfterExtraPayPeriodTax(ab.periodNet, settings.extra_tax_per_pay_period);
  const extraTax = Math.max(0, Number(settings.extra_tax_per_pay_period) || 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Estimated take-home (Alberta)', m, y);
  y += lineH + 1;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const desc = `Gross for this pay period is annualized (× 365 / ${payLen} days) and run through 2025 federal and Alberta tax brackets, basic personal credits, plus CPP and EI—similar to a salaried paycheque, not a contractor invoice.`;
  y = drawWrappedLines(doc, doc.splitTextToSize(desc, maxW), m, y, 3.6);
  y += 2;

  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('Est. net (this pay period)', m, y);
  y += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...JD_GREEN);
  doc.text(formatMoney(projectedNet, currency), m, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const subExtra =
    extraTax > 0
      ? ` • less ${formatMoney(extraTax, currency)} extra withholding per pay period (Settings)`
      : '';
  const sub = `After about ${(ab.effectiveTotalRate * 100).toFixed(1)}% in tax + CPP + EI; annualized gross ≈ ${formatMoney(ab.annualGross, currency)}/yr${subExtra}`;
  y = drawWrappedLines(doc, doc.splitTextToSize(sub, maxW), m, y, 3.5);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [['Federal', 'Alberta', 'CPP', 'EI']],
    body: [
      [
        formatMoney(ab.periodFederalTax, currency),
        formatMoney(ab.periodAbTax, currency),
        formatMoney(ab.periodCpp, currency),
        formatMoney(ab.periodEi, currency),
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249] as [number, number, number],
      textColor: [71, 85, 105] as [number, number, number],
      fontSize: 8,
    },
    bodyStyles: { fontSize: 9, textColor: TEXT_DARK, fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'right' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    margin: { left: m, right: m },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  const disc = `${ALBERTA_NET_DISCLAIMER} Varies with RRSP, dependents, other income, and actual payroll settings.`;
  y = drawWrappedLines(doc, doc.splitTextToSize(disc, maxW), m, y, 3);
  y += 4;
  return y;
}

export function generatePayPeriodPDF(
  period: PayPeriod,
  earnings: EarningsSummary,
  settings: Settings,
) {
  const doc = new jsPDF();
  drawPayPeriodHeader(
    doc,
    settings,
    period,
    'Pay Period Report',
    'Hours and earnings (this pay period)',
  );

  const currency = settings.currency_symbol;
  const rate = Number(settings.hourly_rate);
  const otMultiplier = Number(settings.overtime_multiplier);
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Rate: ${formatMoney(rate, currency)}/hr  |  OT: Mon–Fri after 8 hrs/day, Sat after 4 hrs/day, Sun all hrs @ ${otMultiplier.toFixed(2)}x (${formatMoney(rate * otMultiplier, currency)}/hr)`,
    14,
    58,
  );

  autoTable(doc, {
    startY: 64,
    head: [['', 'Hours', 'Rate', 'Pay']],
    body: [
      [
        'Regular',
        earnings.regularHours.toFixed(2),
        formatMoney(rate, currency),
        formatMoney(earnings.regularPay, currency),
      ],
      [
        'Overtime',
        earnings.overtimeHours.toFixed(2),
        formatMoney(rate * otMultiplier, currency),
        formatMoney(earnings.overtimePay, currency),
      ],
      [
        { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [255, 222, 0] } },
        {
          content: earnings.totalHours.toFixed(2),
          styles: { fontStyle: 'bold', fillColor: [255, 222, 0] },
        },
        { content: '', styles: { fillColor: [255, 222, 0] } },
        {
          content: formatMoney(earnings.totalPay, currency),
          styles: { fontStyle: 'bold', fillColor: [255, 222, 0] },
        },
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: JD_GREEN, textColor: [255, 255, 255] },
    bodyStyles: { fontSize: 10, textColor: TEXT_DARK },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  let cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  cursorY = drawPayPeriodAlbertaNet(doc, cursorY, settings, earnings);
  cursorY += 2;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...JD_GREEN);
  doc.text('Weekly Breakdown', 14, cursorY);
  cursorY += 4;

  autoTable(doc, {
    startY: cursorY,
    head: [['Week', 'Total Hrs', 'Regular', 'Overtime', 'Pay']],
    body: earnings.weeks.map((w) => [
      `${w.weekStart.toLocaleDateString()} – ${w.weekEnd.toLocaleDateString()}`,
      w.totalHours.toFixed(2),
      w.regularHours.toFixed(2),
      w.overtimeHours.toFixed(2),
      formatMoney(w.regularPay + w.overtimePay, currency),
    ]),
    theme: 'grid',
    headStyles: { fillColor: JD_GREEN, textColor: [255, 255, 255] },
    bodyStyles: { fontSize: 9, textColor: TEXT_DARK },
    alternateRowStyles: { fillColor: [241, 248, 238] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  const allJobs = earnings.weeks
    .flatMap((w) => w.jobs)
    .sort((a, b) => {
      if (a.job_date !== b.job_date) return a.job_date.localeCompare(b.job_date);
      return a.start_time.localeCompare(b.start_time);
    });

  if (allJobs.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...JD_GREEN);
    doc.setFontSize(12);
    doc.text('Job Log', 14, cursorY);
    cursorY += 4;
    buildTable(doc, allJobs, cursorY);
  }

  drawFooter(doc, earnings.totalHours);
  doc.save(payPeriodHoursTrackerFilename(settings, period, 'pdf'));
}
