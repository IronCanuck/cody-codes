import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/** Squirtle-inspired export palette (RGB for jsPDF) */
const SQ_BLUE: [number, number, number] = [61, 139, 199];
const SQ_SHELL: [number, number, number] = [122, 101, 80];
const SQ_INK: [number, number, number] = [30, 58, 76];
const SQ_CREAM: [number, number, number] = [245, 236, 216];

export type FurriesCareExportSitter = {
  emergencyName: string;
  emergencyPhone: string;
  vetName: string;
  vetPhone: string;
  feedingSchedule: string;
  medications: string;
  walkNotes: string;
  quirks: string;
  otherNotes: string;
};

export type FurriesCareExportInput = {
  petName: string;
  species: string;
  breed: string;
  gender: string;
  birthdate: string;
  microchip: string;
  profilePhotoDataUrl: string | null;
  sitter: FurriesCareExportSitter;
  medicalHighlights: { date: string; title: string; notes?: string }[];
  recentFood: { dateTime: string; label: string; amount: string }[];
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugFilename(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'pet';
}

function careSheetHtml(data: FurriesCareExportInput): string {
  const s = data.sitter;
  const medRows = data.medicalHighlights
    .map(
      (m) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #cfe8f6;">${escapeHtml(m.date)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #cfe8f6;">${escapeHtml(m.title)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #cfe8f6;color:#3d5c70;">${escapeHtml(m.notes ?? '')}</td>
      </tr>`,
    )
    .join('');
  const foodRows = data.recentFood
    .map(
      (f) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #cfe8f6;">${escapeHtml(f.dateTime)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #cfe8f6;">${escapeHtml(f.label)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #cfe8f6;">${escapeHtml(f.amount)}</td>
      </tr>`,
    )
    .join('');

  const photoBlock = data.profilePhotoDataUrl
    ? `<img src="${data.profilePhotoDataUrl}" alt="" style="width:96px;height:96px;object-fit:cover;border-radius:12px;border:3px solid #3d8bc7;" />`
    : `<div style="width:96px;height:96px;border-radius:12px;background:#e8f4fc;border:2px dashed #6bb8e8;display:flex;align-items:center;justify-content:center;font-size:11px;color:#6bb8e8;">No photo</div>`;

  return `
  <div style="font-family:Helvetica,Arial,sans-serif;color:#1e3a4c;background:#fff;width:720px;">
    <div style="background:#3d8bc7;color:#fff;padding:16px 20px;display:flex;align-items:center;gap:16px;">
      ${photoBlock}
      <div>
        <div style="font-size:20px;font-weight:700;">${escapeHtml(data.petName)}</div>
        <div style="font-size:12px;opacity:0.95;margin-top:4px;">Furries · Pet sitter care sheet</div>
      </div>
    </div>
    <div style="height:4px;background:#7a6550;"></div>
    <div style="padding:18px 20px;">
      <div style="font-size:11px;color:#5a7a8c;margin-bottom:14px;">
        <strong>ID:</strong> ${escapeHtml(data.species)}${data.breed ? ` · ${escapeHtml(data.breed)}` : ''}
        ${data.gender ? ` · ${escapeHtml(data.gender)}` : ''}
        ${data.birthdate ? ` · Born ${escapeHtml(data.birthdate)}` : ''}
        ${data.microchip ? ` · Chip ${escapeHtml(data.microchip)}` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
        <div style="background:#f5ecd8;border:1px solid #e8dcc4;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#7a6550;">Emergency</div>
          <div style="font-size:13px;margin-top:6px;font-weight:600;">${escapeHtml(s.emergencyName || '—')}</div>
          <div style="font-size:12px;color:#2a6fa3;margin-top:2px;">${escapeHtml(s.emergencyPhone || '—')}</div>
        </div>
        <div style="background:#f5ecd8;border:1px solid #e8dcc4;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#7a6550;">Veterinarian</div>
          <div style="font-size:13px;margin-top:6px;font-weight:600;">${escapeHtml(s.vetName || '—')}</div>
          <div style="font-size:12px;color:#2a6fa3;margin-top:2px;">${escapeHtml(s.vetPhone || '—')}</div>
        </div>
      </div>
      <div style="background:#e8f4fc;border-radius:10px;padding:12px 14px;margin-bottom:14px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#2a6fa3;">Feeding</div>
        <div style="font-size:12px;margin-top:6px;line-height:1.45;white-space:pre-wrap;">${escapeHtml(s.feedingSchedule || '—')}</div>
      </div>
      <div style="background:#e8f4fc;border-radius:10px;padding:12px 14px;margin-bottom:14px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#2a6fa3;">Medications</div>
        <div style="font-size:12px;margin-top:6px;line-height:1.45;white-space:pre-wrap;">${escapeHtml(s.medications || '—')}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
        <div style="border:1px solid #cfe8f6;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:700;color:#7a6550;">Walks / exercise</div>
          <div style="font-size:12px;margin-top:6px;line-height:1.45;white-space:pre-wrap;">${escapeHtml(s.walkNotes || '—')}</div>
        </div>
        <div style="border:1px solid #cfe8f6;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:700;color:#7a6550;">Behavior / quirks</div>
          <div style="font-size:12px;margin-top:6px;line-height:1.45;white-space:pre-wrap;">${escapeHtml(s.quirks || '—')}</div>
        </div>
      </div>
      ${s.otherNotes ? `<div style="border:1px solid #cfe8f6;border-radius:10px;padding:12px;margin-bottom:16px;font-size:12px;line-height:1.45;white-space:pre-wrap;"><strong>Other:</strong> ${escapeHtml(s.otherNotes)}</div>` : ''}
      <div style="font-size:12px;font-weight:700;color:#3d8bc7;margin-bottom:6px;">Recent medical notes</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px;">
        <thead><tr style="background:#3d8bc7;color:#fff;">
          <th style="padding:8px;text-align:left;">Date</th>
          <th style="padding:8px;text-align:left;">Title</th>
          <th style="padding:8px;text-align:left;">Notes</th>
        </tr></thead>
        <tbody>${medRows || '<tr><td colspan="3" style="padding:10px;color:#7a9aab;">No records listed.</td></tr>'}</tbody>
      </table>
      <div style="font-size:12px;font-weight:700;color:#3d8bc7;margin-bottom:6px;">Recent meals</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead><tr style="background:#7a6550;color:#fff;">
          <th style="padding:8px;text-align:left;">When</th>
          <th style="padding:8px;text-align:left;">What</th>
          <th style="padding:8px;text-align:left;">Amount</th>
        </tr></thead>
        <tbody>${foodRows || '<tr><td colspan="3" style="padding:10px;color:#7a9aab;">No meals listed.</td></tr>'}</tbody>
      </table>
    </div>
    <div style="border-top:2px solid #3d8bc7;padding:10px 20px;font-size:10px;color:#5a7a8c;display:flex;justify-content:space-between;">
      <span>Generated ${new Date().toLocaleString()}</span>
      <span style="font-weight:600;color:#3d8bc7;">Furries</span>
    </div>
  </div>`;
}

async function htmlToPngBlob(html: string): Promise<Blob> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    const el = container.firstElementChild as HTMLElement;
    const canvas = await html2canvas(el, {
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

export async function downloadFurriesCarePng(data: FurriesCareExportInput): Promise<void> {
  const html = careSheetHtml(data);
  const blob = await htmlToPngBlob(html);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `furries-care-${slugFilename(data.petName)}.png`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadFurriesCarePdf(data: FurriesCareExportInput): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const m = 14;
  let y = m;

  doc.setFillColor(...SQ_BLUE);
  doc.rect(0, 0, pageW, 32, 'F');
  doc.setFillColor(...SQ_SHELL);
  doc.rect(0, 32, pageW, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(data.petName || 'Pet', m, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Furries · Pet sitter care sheet', m, 22);

  if (data.profilePhotoDataUrl) {
    try {
      doc.addImage(data.profilePhotoDataUrl, 'JPEG', pageW - m - 22, 6, 22, 22);
    } catch {
      try {
        doc.addImage(data.profilePhotoDataUrl, 'PNG', pageW - m - 22, 6, 22, 22);
      } catch {
        /* skip broken image */
      }
    }
  }

  doc.setTextColor(...SQ_INK);
  y = 42;
  doc.setFontSize(9);
  doc.setTextColor(80, 100, 120);
  const idLine = [
    data.species,
    data.breed,
    data.gender,
    data.birthdate ? `Born ${data.birthdate}` : '',
    data.microchip ? `Chip ${data.microchip}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const idWrapped = doc.splitTextToSize(idLine || '—', pageW - 2 * m);
  doc.text(idWrapped, m, y);
  y += idWrapped.length * 4 + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...SQ_SHELL);
  doc.text('Emergency contact', m, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SQ_INK);
  y += 5;
  doc.text(`${data.sitter.emergencyName || '—'}  ${data.sitter.emergencyPhone || ''}`.trim(), m, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SQ_SHELL);
  doc.text('Veterinarian', m, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SQ_INK);
  y += 5;
  doc.text(`${data.sitter.vetName || '—'}  ${data.sitter.vetPhone || ''}`.trim(), m, y);
  y += 10;

  doc.setFillColor(...SQ_CREAM);
  doc.roundedRect(m, y - 2, pageW - 2 * m, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SQ_BLUE);
  doc.text('Feeding schedule', m + 3, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SQ_INK);
  const feedLines = doc.splitTextToSize(data.sitter.feedingSchedule || '—', pageW - 2 * m - 6);
  doc.text(feedLines, m + 3, y + 9);
  y += 22 + 6;

  doc.setFillColor(232, 244, 252);
  doc.roundedRect(m, y - 2, pageW - 2 * m, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...SQ_BLUE);
  doc.text('Medications', m + 3, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SQ_INK);
  const medLines = doc.splitTextToSize(data.sitter.medications || '—', pageW - 2 * m - 6);
  doc.text(medLines, m + 3, y + 9);
  y += 22 + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...SQ_SHELL);
  doc.text('Walks / exercise', m, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SQ_INK);
  const walkLines = doc.splitTextToSize(data.sitter.walkNotes || '—', pageW - 2 * m);
  doc.text(walkLines, m, y);
  y += walkLines.length * 3.6 + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...SQ_SHELL);
  doc.text('Behavior / quirks', m, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SQ_INK);
  const qLines = doc.splitTextToSize(data.sitter.quirks || '—', pageW - 2 * m);
  doc.text(qLines, m, y);
  y += qLines.length * 3.6 + 6;

  if (data.sitter.otherNotes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...SQ_SHELL);
    doc.text('Other notes', m, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SQ_INK);
    const oLines = doc.splitTextToSize(data.sitter.otherNotes, pageW - 2 * m);
    doc.text(oLines, m, y);
    y += oLines.length * 3.6 + 8;
  }

  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - 50) {
    doc.addPage();
    y = m;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...SQ_BLUE);
  doc.text('Recent medical notes', m, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (data.medicalHighlights.length === 0) {
    doc.setTextColor(120, 120, 120);
    doc.text('No records listed.', m, y);
    y += 8;
  } else {
    for (const rec of data.medicalHighlights.slice(0, 8)) {
      doc.setTextColor(...SQ_INK);
      const line = `• ${rec.date} — ${rec.title}${rec.notes ? ` (${rec.notes})` : ''}`;
      const wrapped = doc.splitTextToSize(line, pageW - 2 * m);
      doc.text(wrapped, m, y);
      y += wrapped.length * 3.8 + 2;
      if (y > pageH - 24) {
        doc.addPage();
        y = m;
      }
    }
  }

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...SQ_BLUE);
  doc.text('Recent meals', m, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (data.recentFood.length === 0) {
    doc.setTextColor(120, 120, 120);
    doc.text('No meals listed.', m, y);
  } else {
    for (const f of data.recentFood.slice(0, 12)) {
      doc.setTextColor(...SQ_INK);
      const line = `• ${f.dateTime} — ${f.label} (${f.amount || '—'})`;
      const wrapped = doc.splitTextToSize(line, pageW - 2 * m);
      doc.text(wrapped, m, y);
      y += wrapped.length * 3.8 + 2;
      if (y > pageH - 20) {
        doc.addPage();
        y = m;
      }
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Generated ${new Date().toLocaleString()} · Furries`,
      m,
      doc.internal.pageSize.getHeight() - 10,
    );
    doc.text(`Page ${i} of ${totalPages}`, pageW - m, doc.internal.pageSize.getHeight() - 10, {
      align: 'right',
    });
  }

  doc.save(`furries-care-${slugFilename(data.petName)}.pdf`);
}
