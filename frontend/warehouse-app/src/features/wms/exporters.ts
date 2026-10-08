import { escapeHtml } from '@/features/wms/html';

// ─── Export helpers ───────────────────────────────────────────────────────────

export function exportCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))];
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename + '.csv'; a.style.display = 'none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function exportExcel(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const headerRow = headers.map(h => `<Cell ss:StyleID="header"><Data ss:Type="String">${h.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Data></Cell>`).join('');
  const dataRows = rows.map((r, ri) =>
    `<Row>${headers.map(h => {
      const v = r[h] ?? '';
      const type = typeof v === 'number' ? 'Number' : 'String';
      const style = ri % 2 === 0 ? 'even' : 'odd';
      return `<Cell ss:StyleID="${style}"><Data ss:Type="${type}">${String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Data></Cell>`;
    }).join('')}</Row>`
  ).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:x="urn:schemas-microsoft-com:office:excel">
<Styles>
  <Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#2563EB" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="even"><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/></Style>
  <Style ss:ID="odd"><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/></Style>
</Styles>
<Worksheet ss:Name="Report"><Table><Row>${headerRow}</Row>${dataRows}</Table></Worksheet></Workbook>`;
  const bom = '\uFEFF';
  const blob = new Blob([bom + xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename + '.xls'; a.style.display = 'none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function exportPdf(title: string, headers: string[], rows: (string | number)[][]) {
  const W = 794; const H = 1123; // A4 px at 96dpi
  const margin = 40;
  const colW = Math.floor((W - margin * 2) / headers.length);
  const rowH = 28; const headH = 36;
  const tableTop = 120;
  const maxRowsPerPage = Math.floor((H - tableTop - margin) / rowH);

  const pages: string[] = [];
  let pageRows = rows;
  let pageNum = 1;
  while (pageRows.length > 0 || pageNum === 1) {
    const chunk = pageRows.slice(0, maxRowsPerPage);
    pageRows = pageRows.slice(maxRowsPerPage);

    const headerCells = headers.map((h, i) =>
      `<rect x="${margin + i * colW}" y="${tableTop}" width="${colW}" height="${headH}" fill="#2563eb"/>
       <text x="${margin + i * colW + 8}" y="${tableTop + 23}" font-size="11" fill="white" font-weight="bold" font-family="Arial,Helvetica,sans-serif">${escapeHtml(h)}</text>`
    ).join('');

    const dataCells = chunk.map((row, ri) =>
      row.map((cell, ci) =>
        `${ri % 2 === 0 ? `<rect x="${margin + ci * colW}" y="${tableTop + headH + ri * rowH}" width="${colW}" height="${rowH}" fill="#f8fafc"/>` : ''}
         <text x="${margin + ci * colW + 8}" y="${tableTop + headH + ri * rowH + 18}" font-size="10" fill="#1e293b" font-family="Arial,Helvetica,sans-serif">${escapeHtml(String(cell).slice(0, 30))}</text>`
      ).join('')
    ).join('');

    pages.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#fff;display:block;font-family:Arial,Helvetica,sans-serif">
      <rect width="${W}" height="80" fill="#2563eb"/>
      <text x="${margin}" y="52" font-size="22" fill="white" font-weight="bold" font-family="Arial,Helvetica,sans-serif">${escapeHtml(title)}</text>
      <text x="${W - margin}" y="52" font-size="12" fill="rgba(255,255,255,0.7)" text-anchor="end">${new Date().toLocaleDateString('en-US')} — Page ${pageNum}</text>
      ${headerCells}${dataCells}
    </svg>`);
    pageNum++;
    if (pageRows.length === 0) break;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap" rel="stylesheet">
    <style>body{margin:0;font-family:'Noto Sans',Arial,sans-serif}svg{page-break-after:always;display:block}@media print{button{display:none}}</style>
    </head><body>
    <button onclick="window.print()" style="position:fixed;top:10px;right:10px;z-index:999;padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">🖨️ Print / Save as PDF</button>
    ${pages.join('')}</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
