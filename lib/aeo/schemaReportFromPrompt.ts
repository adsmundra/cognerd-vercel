export interface SchemaAuditOutput {
  optimizedSchema: any;
  auditReport: {
    missingElements: any[];
    outdatedElements: any[];
    enhancements: any[];
    visibilityGains: any[];
    finalRecommendations: any[];
  };
}

function parseSchemaOutput(input: any): SchemaAuditOutput {
  if (typeof input === 'object' && input) return input as SchemaAuditOutput;
  let raw = String(input ?? '').trim();
  // strip code fences
  raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
  let data: any = tryParse(raw);
  if (typeof data === 'string') data = tryParse(data) || data;
  if (!data) {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) data = tryParse(m[0]) || tryParse(m[0].replace(/'/g, '"'));
  }
  if (!data) return { optimizedSchema: {}, auditReport: { missingElements: [], outdatedElements: [], enhancements: [], visibilityGains: [], finalRecommendations: [] } };
  return data as SchemaAuditOutput;
}

function normalizeSections(report: SchemaAuditOutput['auditReport']) {
  const toStrings = (arr: any[]) => (arr||[]).map((item: any) => {
    if (typeof item === 'string') return item;
    if (!item || typeof item !== 'object') return '';
    const key = item.element || item.improvement || item.gain || 'Item';
    const desc = item.description || '';
    return `${key}: ${desc}`;
  }).filter(Boolean);
  return {
    missing: toStrings(report.missingElements||[]),
    outdated: toStrings(report.outdatedElements||[]),
    enhancements: toStrings(report.enhancements||[]),
    gains: toStrings(report.visibilityGains||[]),
    recommendations: toStrings(report.finalRecommendations||[]),
  };
}

function computeMetrics(sections: ReturnType<typeof normalizeSections>) {
  const missing = sections.missing.length;
  const outdated = sections.outdated.length;
  const enhancements = sections.enhancements.length;
  const gains = sections.gains.length;
  const health_score = Math.max(100 - (missing * 5 + outdated * 3), 0);
  const potential_gain = Math.min(100, gains * 10);
  return { health_score, missing, outdated, enhancements, potential_gain };
}

export function renderSchemaAuditToHtml(input: SchemaAuditOutput | string, customerName: string): string {
  const data = parseSchemaOutput(input);
  const sections = normalizeSections(data.auditReport || { missingElements: [], outdatedElements: [], enhancements: [], visibilityGains: [], finalRecommendations: [] });
  const metrics = computeMetrics(sections);
  const ldjson = JSON.stringify(data.optimizedSchema || {}, null, 2);

  const list = (title: string, items: string[]) => `
    <section class="card">
      <h2>${escapeHtml(title)}</h2>
      <ul>${(items && items.length ? items : ['—']).map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
    </section>`;

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Schema Audit - ${escapeHtml(customerName)}</title>
      <style>
      /* Print-friendly A3 page setup */
      @page { size: A3 landscape; margin: 12mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        header { page-break-after: avoid; }
        .card { page-break-inside: avoid; }
      }
      /* inlined report_style.css (subset used) */
body {font-family:'Segoe UI','Roboto',Arial,sans-serif;margin:0;padding:0;background:#f4f6f9;color:#333}
header {background:#1877f2;color:white;padding:20px 0;text-align:center}
header h1 {margin:0;font-size:2em}
header p {margin:5px 0 0;font-size:0.95em;color:#e4e6eb}
.container {max-width:1200px;margin:20px auto;padding:0 20px}
.top-metrics {display:flex;flex-wrap:wrap;gap:20px;justify-content:space-around;margin-bottom:30px}
.metric {flex:1 1 200px;min-width:180px;background:linear-gradient(135deg,#3498db,#2980b9);color:white;padding:20px;border-radius:12px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.card {background:white;border-radius:12px;padding:20px;margin:20px 0;box-shadow:0 4px 12px rgba(0,0,0,0.08)}
.card h2 {margin-top:0;font-size:1.4em;color:#2c3e50;border-bottom:2px solid #ecf0f1;padding-bottom:8px}
.card ul {margin:10px 0;padding-left:20px}
.card li {margin:8px 0;line-height:1.5}
 table {border-collapse:collapse;width:100%;margin-top:10px;font-size:.9em;overflow-x:auto;display:block}
 th,td {border:1px solid #ddd;padding:10px}
 th {background:#3498db;color:white;text-align:left;position:sticky;top:0}
 tr:nth-child(even){background:#f2f4f7}
      </style>
    </head>
    <body>
      <header>
        <h1>${escapeHtml(customerName)} Schema Audit Report</h1>
        <p>Automated Schema & Visibility Review</p>
      </header>
      <div class="container">
        <div class="top-metrics">
          <div class="metric"><h3>Health Score</h3><span>${metrics.health_score}/100</span></div>
          <div class="metric"><h3>Missing</h3><span>${metrics.missing}</span></div>
          <div class="metric"><h3>Outdated</h3><span>${metrics.outdated}</span></div>
          <div class="metric"><h3>Enhancements</h3><span>${metrics.enhancements}</span></div>
          <div class="metric"><h3>Potential Gain</h3><span>${metrics.potential_gain}%</span></div>
        </div>

        ${list('Missing Elements', sections.missing)}
        ${list('Outdated Elements', sections.outdated)}
        ${list('Enhancements', sections.enhancements)}
        ${list('Visibility Gains', sections.gains)}
        ${list('Final Recommendations', sections.recommendations)}

        <section class="card">
          <h2>Optimized Schema JSON</h2>
          <pre>${escapeHtml(ldjson)}</pre>
          <script type="application/ld+json">${escapeHtml(ldjson)}</script>
        </section>
      </div>
    </body>
  </html>`;
}

function escapeHtml(s: string) {
  return String(s || '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'} as any)[c] || c);
}
