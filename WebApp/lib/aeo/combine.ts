import { InsightsResult } from './insights';

export function renderCombinedHtml(params: { customerName: string; url?: string; sections: string[]; insights: InsightsResult; }): string {
  const { customerName, url, sections, insights } = params;
  const labels = Object.keys(insights.metrics.statusBuckets);
  const values = labels.map(k => insights.metrics.statusBuckets[k]);

  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>AEO Combined Report - ${customerName}</title>
    <style>
      /* Print-friendly A3 page setup */
      @page { size: A3 landscape; margin: 12mm; }

function renderInlineBarChart(labels: string[], values: number[], opts?: {title?: string; width?: number; height?: number; max?: number; colors?: string[]}){
  const width = opts?.width ?? 520;
  const height = opts?.height ?? 220;
  const padding = { top: 24, right: 24, bottom: 36, left: 36 } as const;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const maxVal = opts?.max ?? Math.max(1, ...values);
  const barW = innerW / Math.max(1, labels.length);
  const colors = opts?.colors ?? ['#0a5bd3', '#9b59b6', '#e74c3c', '#2ecc71', '#f1c40f'];
  const bars = values.map((v, i) => {
    const h = Math.max(0, Math.round((v / maxVal) * innerH));
    const x = Math.round(padding.left + i * barW + barW * 0.1);
    const y = Math.round(padding.top + (innerH - h));
    const w = Math.round(barW * 0.8);
    const color = colors[i % colors.length];
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" rx="4" />`;
  }).join('');
  const xLabels = labels.map((lab, i) => {
    const x = Math.round(padding.left + i * barW + barW / 2);
    const y = height - 8;
    return `<text x="${x}" y="${y}" text-anchor="middle" font-size="11" fill="#555">${escapeHtml(String(lab))}</text>`;
  }).join('');
  const yAxis = `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + innerH}" stroke="#ccc" />`;
  const xAxis = `<line x1="${padding.left}" y1="${padding.top + innerH}" x2="${padding.left + innerW}" y2="${padding.top + innerH}" stroke="#ccc" />`;
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(opts?.title || 'bar chart')}">
    <desc>Bar chart</desc>
    ${yAxis}${xAxis}${bars}${xLabels}
  </svg>`;
}

function escapeHtml(s: string) {
  return String(s || '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'} as any)[c] || c);
}
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        header { page-break-after: avoid; }
        .card { page-break-inside: avoid; }
      }
      body{font-family:Arial,Helvetica,sans-serif;margin:20px;color:#111;background:#fafafa}
      header{border-bottom:2px solid #0a5bd3;padding-bottom:10px;margin-bottom:20px}
      .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
      .card{background:#fff;border:1px solid #e4e4e4;padding:12px;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,0.04)}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #eaeaea;padding:6px;text-align:left}
      th{background:#f5f5f5}
      pre{background:#f8f8f8;padding:10px;border-radius:6px;overflow:auto}
    </style>
  </head>
  <body>
    <header>
      <h1>AEO Combined Report</h1>
      <p>Customer: ${customerName}${url ? ' | URL: ' + url : ''} | Generated: ${new Date().toLocaleString()}</p>
    </header>

    <section class="grid">
      <div class="card">
        <h2>Overview</h2>
        <ul>
          <li>Total pages: ${insights.metrics.totalPages}</li>
          <li>OK pages: ${insights.metrics.okPages}</li>
          <li>Error pages: ${insights.metrics.errorPages}</li>
          <li>Avg response: ${insights.metrics.avgResponseMs} ms</li>
          <li>Avg word count: ${insights.metrics.avgWordCount}</li>
          <li>Missing titles: ${insights.metrics.missingTitles}</li>
          <li>Missing meta: ${insights.metrics.missingMeta}</li>
        </ul>
      </div>
      <div class="card">
        <h2>Status Codes</h2>
        ${renderInlineBarChart(labels, values, { width: 520, height: 220, title: 'Pages by Status' })}
      </div>
      <div class="card">
        <h2>Top Insights</h2>
        <ul>
          ${insights.insights.map(i => `<li><strong>${i.title}</strong> (${i.severity}) – ${i.description}</li>`).join('') || '<li>No major issues detected</li>'}
        </ul>
      </div>
    </section>

    ${sections.join('\n')}
  </body>
  </html>`;
}
