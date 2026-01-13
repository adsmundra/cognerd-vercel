type StructuredItem = {
  type: string;
  textOrSummary: string;
  status: string;
  issues?: string[];
  recommendedChanges?: string;
};

type UnstructuredItem = {
  contentType: string;
  textOrAlt: string;
  suggestedAeoType?: string;
  reasonItIsImportant?: string;
  recommendation?: string;
};

type Suggestion = {
  existingContent?: string;
  problem?: string;
  suggestedFix?: string;
};

type NewContent = {
  contentType: string;
  suggestedTopicOrText: string;
  aeoType?: string;
  reasonForAdding?: string;
};

export interface AeoModelOutput {
  url: string;
  structuredContent: StructuredItem[];
  unstructuredContent: UnstructuredItem[];
  optimizationSuggestions: Suggestion[];
  newContentRecommendations: NewContent[];
  summaryScore: {
    structuredCoverage: number;
    unstructuredCoverage: number;
    optimizationOpportunities: number;
    overallAEOReadiness: number;
  };
}

function cleanAndParseAeo(input: any): AeoModelOutput[] {
  // Accept already-parsed objects
  if (Array.isArray(input)) return input as AeoModelOutput[];
  if (typeof input === 'object' && input) return [input as AeoModelOutput];
  let raw = String(input ?? '').trim();
  if (!raw) return [];
  // Strip code fences
  raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  // Try JSON.parse directly, else try to unquote and fix single quotes
  const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
  let data = tryParse(raw);
  if (typeof data === 'string') data = tryParse(data) || data;
  if (!data) {
    // extract first {...}
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      data = tryParse(m[0]) || tryParse(m[0].replace(/'/g, '"'));
    }
  }
  if (!data) return [];
  return Array.isArray(data) ? (data as AeoModelOutput[]) : [data as AeoModelOutput];
}

function computeSummary(items: AeoModelOutput[]) {
  const first = items[0] || ({} as AeoModelOutput);
  const sc = (first.structuredContent||[]).reduce((acc: Record<string, number>, it) => {
    const k = (it.status||'other').toLowerCase(); acc[k] = (acc[k]||0)+1; return acc;
  }, {} as Record<string, number>);
  const totalSchemas = (first.structuredContent||[]).length;
  const unstructuredCounts = (first.unstructuredContent||[]).reduce((acc: Record<string, number>, it) => {
    const k = it.contentType || 'unknown'; acc[k] = (acc[k]||0)+1; return acc;
  }, {} as Record<string, number>);
  const optimizationCount = (first.optimizationSuggestions||[]).length;
  const scores = first.summaryScore || { structuredCoverage:0, unstructuredCoverage:0, optimizationOpportunities:0, overallAEOReadiness:0 };
  return { schemaCounts: sc, totalSchemas, unstructuredCounts, totalUnstructured: (first.unstructuredContent||[]).length, optimizationCount, scores };
}

export function renderAeoJsonToHtml(data: AeoModelOutput | AeoModelOutput[] | string, customerName: string): string {
  const items = cleanAndParseAeo(data);
  const summary = computeSummary(items);
  const sections = items.map(page => `
    <section class="card">
  <h2>Page: ${escapeHtml(page.url)}</h2>
  <div class="grid">
    <div class="card">
      <h3>Summary Scores</h3>
      <ul>
        <li>Structured Coverage: ${page.summaryScore?.structuredCoverage ?? 0}</li>
        <li>Unstructured Coverage: ${page.summaryScore?.unstructuredCoverage ?? 0}</li>
        <li>Optimization Opportunities: ${page.summaryScore?.optimizationOpportunities ?? 0}</li>
        <li>Overall AEO Readiness: ${page.summaryScore?.overallAEOReadiness ?? 0}</li>
      </ul>
    </div>

    <div class="card">
      <h3>Structured Content</h3>
      <ul>
        ${(page.structuredContent||[]).map(it => 
          `<li><b>${escapeHtml(it.type)}</b> — ${escapeHtml(it.textOrSummary)} 
          <em>(${escapeHtml(it.status)})</em>${renderIssues(it.issues)}${renderRec(it.recommendedChanges)}</li>`
        ).join('') || '<li>—</li>'}
      </ul>
    </div>

    <div class="card">
      <h3>Unstructured Content</h3>
      <ul>
        ${(page.unstructuredContent||[]).map(it => 
          `<li><b>${escapeHtml(it.contentType)}</b> — ${escapeHtml(it.textOrAlt)} 
          ${it.suggestedAeoType ? `(suggest: ${escapeHtml(it.suggestedAeoType)})` : ''} 
          ${it.reasonItIsImportant ? ` — ${escapeHtml(it.reasonItIsImportant)}`: ''} 
          ${it.recommendation ? ` — <em>${escapeHtml(it.recommendation)}</em>`: ''}</li>`
        ).join('') || '<li>—</li>'}
      </ul>
    </div>

    <div class="card">
      <h3>Optimization Suggestions</h3>
      <ul>
        ${(page.optimizationSuggestions||[]).map(s => 
          `<li>${s.existingContent ? `<b>${escapeHtml(s.existingContent)}</b>: `: ''} 
          ${escapeHtml(s.problem || '')} — <em>${escapeHtml(s.suggestedFix || '')}</em></li>`
        ).join('') || '<li>—</li>'}
      </ul>
    </div>

    <div class="card">
      <h3>New Content Recommendations</h3>
      <ul>
        ${(page.newContentRecommendations||[]).map(nc => 
          `<li><b>${escapeHtml(nc.contentType)}</b> — ${escapeHtml(nc.suggestedTopicOrText)} 
          ${nc.aeoType ? ` (as ${escapeHtml(nc.aeoType)})`: ''} 
          ${nc.reasonForAdding ? ` — ${escapeHtml(nc.reasonForAdding)}`: ''}</li>`
        ).join('') || '<li>—</li>'}
      </ul>
    </div>
  </div>
</section>
  `).join('\n');

  const labels = Object.keys(summary.schemaCounts);
  const values = labels.map(k => summary.schemaCounts[k]);
  const radarLabels = ['Structured','Unstructured','Optimization','Overall'];
  const radarValues = [
    summary.scores.structuredCoverage||0,
    summary.scores.unstructuredCoverage||0,
    summary.scores.optimizationOpportunities||0,
    summary.scores.overallAEOReadiness||0
  ];
  const overall = summary.scores.overallAEOReadiness||0;
  const unLabels = Object.keys(summary.unstructuredCounts||{});
  const unValues = unLabels.map(k => summary.unstructuredCounts[k]);

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>AEO Audit (AI) - ${escapeHtml(customerName)}</title>
      <style>
      /* Print-friendly A3 page setup */
      @page { size: A3 landscape; margin: 12mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        header { page-break-after: avoid; }
        .card { page-break-inside: avoid; }
      }
      /* inlined report_style.css */
      /* ===============================
Global Layout
=============================== */
body {font-family:'Segoe UI','Roboto',Arial,sans-serif;margin:0;padding:0;background:#f4f6f9;color:#333}
header {background:#1877f2;color:white;padding:20px 0;text-align:center}
header h1 {margin:0;font-size:2em}
header p {margin:5px 0 0;font-size:0.95em;color:#e4e6eb}
.container {max-width:1200px;margin:20px auto;padding:0 20px}
.top-metrics {display:flex;flex-wrap:wrap;gap:20px;justify-content:space-around;margin-bottom:30px}
.metric {flex:1 1 200px;min-width:180px;background:linear-gradient(135deg,#3498db,#2980b9);color:white;padding:20px;border-radius:12px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:all .3s}
.metric:hover {transform:translateY(-3px);box-shadow:0 6px 20px rgba(0,0,0,0.25)}
.metric h3 {font-size:1em;margin-bottom:10px}
.metric span {font-size:1.6em;font-weight:bold}
.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transition: all 0.3s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0,0,0,0.18);
}

.card h2 {
  margin-top: 0;
  font-size: 1.4em;
  color: #2c3e50;
  border-bottom: 2px solid #ecf0f1;
  padding-bottom: 8px;
}

/* 🧱 FIX: Make cards stack vertically */
.grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.summary {font-size:1.05em;margin-bottom:10px}
.badge {display:inline-block;padding:4px 12px;border-radius:16px;font-size:.85em;font-weight:bold;color:white}
.badge.green {background:#27ae60}.badge.red {background:#e74c3c}.badge.orange {background:#f39c12}.badge.gray {background:#7f8c8d}
.redflag {color:#e74c3c;font-weight:bold}.good {color:#27ae60;font-weight:bold}
 table {border-collapse:collapse;width:100%;margin-top:10px;font-size:.9em;overflow-x:auto;display:block}
 th,td {border:1px solid #ddd;padding:10px}
 th {background:#3498db;color:white;text-align:left;position:sticky;top:0}
 tr:nth-child(even){background:#f2f4f7}
 .card ul {margin:10px 0;padding-left:20px}
 .card li {margin:8px 0;line-height:1.5}
 @media (max-width:768px){.top-metrics{flex-direction:column;align-items:center}.metric{min-width:80%}}
 /* chart sizing tweaks */
 .charts-row{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start}
 .charts-row .chart{flex:1 1 260px;min-width:260px}
 .small-chart{max-width:360px;margin:auto}
      </style>
    </head>
    <body>
      <header>
        <h1>AEO Audit (AI)</h1>
        <p>Customer: ${escapeHtml(customerName)} | Generated: ${new Date().toLocaleString()}</p>
      </header>
      <div class="container">
        <div class="top-metrics">
          <div class="metric"><h3>Structured Coverage</h3><span>${summary.scores.structuredCoverage ?? 'N/A'}%</span></div>
          <div class="metric"><h3>Unstructured Coverage</h3><span>${summary.scores.unstructuredCoverage ?? 'N/A'}%</span></div>
          <div class="metric"><h3>Optimization</h3><span>${summary.scores.optimizationOpportunities ?? 'N/A'}%</span></div>
          <div class="metric"><h3>Overall Readiness</h3><span>${summary.scores.overallAEOReadiness ?? 'N/A'}%</span></div>
        </div>

        <section class="card">
          <h2>Visuals</h2>
          <div class="charts-row">
            <div class="chart">
              <h3>Schema Status Counts</h3>
              ${renderBarChart(labels, values, { title: 'Schemas', width: 360, height: 160 })}
            </div>
            <div class="chart">
              <h3>AEO Readiness Radar</h3>
              ${renderRadarChart(radarLabels, radarValues, { width: 360, height: 260, max: 100 })}
            </div>
            <div class="chart">
              <h3>Overall Gauge</h3>
              ${renderGauge(overall, { width: 360, height: 160 })}
            </div>
          </div>
          <div class="small-chart" style="margin-top:16px">
            <h3 style="text-align:center;margin-bottom:8px">Unstructured Content Distribution</h3>
            ${renderPieChart(unLabels, unValues, { width: 360, height: 160 })}
          </div>
        </section>

        <section class="card">
          <h2>Counts & Key Numbers</h2>
          <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Total schema objects audited</td><td>${summary.totalSchemas}</td></tr>
            <tr><td>Valid schemas</td><td>${summary.schemaCounts['valid']||0}</td></tr>
            <tr><td>Incorrect schemas</td><td>${summary.schemaCounts['incorrect']||0}</td></tr>
            <tr><td>Missing schemas</td><td>${summary.schemaCounts['missing']||0}</td></tr>
            <tr><td>Total unstructured blocks</td><td>${summary.totalUnstructured}</td></tr>
            <tr><td>Optimization suggestions</td><td>${summary.optimizationCount}</td></tr>
          </table>
        </section>

        ${sections}
      </div>

      <script type="application/json" id="aeo-metrics">${escapeHtml(JSON.stringify({
        schemaCompleteness: {
          counts: summary.schemaCounts,
          totalSchemas: summary.totalSchemas
        },
        readiness: {
          structuredCoverage: summary.scores.structuredCoverage || 0,
          unstructuredCoverage: summary.scores.unstructuredCoverage || 0,
          optimizationOpportunities: summary.scores.optimizationOpportunities || 0,
          overallAEOReadiness: summary.scores.overallAEOReadiness || 0
        },
        unstructuredDistribution: summary.unstructuredCounts,
        optimizationCount: summary.optimizationCount
      }))}</script>

    </body>
  </html>`;
}

// ----- Inline SVG Chart Helpers (no external library) -----
function renderBarChart(labels: string[], values: number[], opts?: {title?: string; width?: number; height?: number; max?: number; colors?: string[]}){
  const width = opts?.width ?? 360;
  const height = opts?.height ?? 160;
  const padding = { top: 20, right: 16, bottom: 28, left: 30 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const maxVal = (opts?.max ?? Math.max(1, ...values));
  const barW = innerW / Math.max(1, labels.length);
  const colors = opts?.colors ?? ['#3498db', '#9b59b6', '#e74c3c', '#2ecc71', '#f1c40f'];
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
    const y = height - 6;
    return `<text x="${x}" y="${y}" text-anchor="middle" font-size="10" fill="#555">${escapeHtml(lab)}</text>`;
  }).join('');
  const yAxis = `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + innerH}" stroke="#ccc" />`;
  const xAxis = `<line x1="${padding.left}" y1="${padding.top + innerH}" x2="${padding.left + innerW}" y2="${padding.top + innerH}" stroke="#ccc" />`;
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(opts?.title || 'bar chart')}">
    <desc>Bar chart</desc>
    ${yAxis}${xAxis}${bars}${xLabels}
  </svg>`;
}

function renderGauge(value: number, opts?: {width?: number; height?: number}){
  const width = opts?.width ?? 360;
  const height = opts?.height ?? 160; // semicircle area
  const cx = width/2, cy = height;   // center at bottom middle
  const r = Math.min(width/2 - 10, height - 10);
  const pct = Math.max(0, Math.min(100, value));
  const angle = Math.PI * (1 - pct/100); // 0% -> PI, 100% -> 0
  const x = cx + r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  const arcBg = describeArc(cx, cy, r, Math.PI, 0);
  const arcVal = describeArc(cx, cy, r, Math.PI, angle);
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="gauge ${pct}%">
    <desc>Gauge</desc>
    <path d="${arcBg}" fill="none" stroke="#ecf0f1" stroke-width="14" />
    <path d="${arcVal}" fill="none" stroke="#27ae60" stroke-width="14" />
    <circle cx="${cx}" cy="${cy}" r="4" fill="#7f8c8d" />
    <line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#2c3e50" stroke-width="3" />
    <text x="${cx}" y="${cy-8}" text-anchor="middle" font-size="12" fill="#2c3e50">${pct}%</text>
  </svg>`;
}

function describeArc(cx:number, cy:number, r:number, start:number, end:number){
  const sx = cx + r * Math.cos(start);
  const sy = cy - r * Math.sin(start);
  const ex = cx + r * Math.cos(end);
  const ey = cy - r * Math.sin(end);
  const largeArcFlag = end - start <= Math.PI ? 0 : 1; // always <= PI for gauge parts
  return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArcFlag} 1 ${ex} ${ey}`;
}

function renderPieChart(labels: string[], values: number[], opts?: {width?: number; height?: number}){
  const width = opts?.width ?? 360;
  const height = opts?.height ?? 160;
  const cx = width/2, cy = height/2 + 10; // slight downward center
  const r = Math.min(width, height)/2 - 10;
  const total = Math.max(1, values.reduce((a,b)=>a+b,0));
  const colors = ['#3498db','#9b59b6','#e74c3c','#2ecc71','#f1c40f','#1abc9c','#e67e22','#34495e'];
  let angle = -Math.PI/2;
  const slices: string[] = [];
  for(let i=0;i<values.length;i++){
    const frac = values[i]/total;
    const a2 = angle + frac * Math.PI*2;
    const large = frac>0.5?1:0;
    const x1 = cx + r*Math.cos(angle), y1 = cy + r*Math.sin(angle);
    const x2 = cx + r*Math.cos(a2), y2 = cy + r*Math.sin(a2);
    const color = colors[i % colors.length];
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    slices.push(`<path d="${path}" fill="${color}" />`);
    angle = a2;
  }
  // legend
  const legend = labels.map((lab,i)=>{
    const color = colors[i % colors.length];
    return `<g transform="translate(${width-110}, ${10 + i*16})">
      <rect x="0" y="-10" width="10" height="10" fill="${color}" />
      <text x="16" y="0" font-size="10" fill="#555">${escapeHtml(lab)} (${values[i]||0})</text>
    </g>`;
  }).join('');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="pie chart">
    <desc>Pie chart</desc>
    ${slices.join('')}
    ${legend}
  </svg>`;
}

function renderRadarChart(labels: string[], values: number[], opts?: { width?: number; height?: number; max?: number }){
  const width = opts?.width ?? 360;
  const height = opts?.height ?? 260;
  const cx = width/2, cy = height/2 + 10;
  const r = Math.min(width, height)/2 - 20;
  const maxVal = opts?.max ?? 100;
  const N = Math.max(1, labels.length);
  const angleStep = (Math.PI * 2) / N;
  const toPoint = (i: number, v: number) => {
    const ang = -Math.PI/2 + i*angleStep;
    const radius = r * Math.max(0, Math.min(1, v / maxVal));
    const x = cx + radius * Math.cos(ang);
    const y = cy + radius * Math.sin(ang);
    return {x, y};
  };
  // grid (concentric polygons)
  const rings = 4;
  const grid = Array.from({length: rings}, (_,ri)=>{
    const frac = (ri+1)/rings;
    const pts = Array.from({length:N}, (_,i)=>{
      const ang = -Math.PI/2 + i*angleStep;
      const x = cx + r*frac*Math.cos(ang);
      const y = cy + r*frac*Math.sin(ang);
      return `${x},${y}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="#eaecef" stroke-width="1" />`;
  }).join('');
  // axes and labels
  const axes = labels.map((lab, i)=>{
    const end = toPoint(i, maxVal);
    const lx = cx + (r+12) * Math.cos(-Math.PI/2 + i*angleStep);
    const ly = cy + (r+12) * Math.sin(-Math.PI/2 + i*angleStep);
    return `<line x1="${cx}" y1="${cy}" x2="${end.x}" y2="${end.y}" stroke="#d0d7de" />
            <text x="${lx}" y="${ly}" font-size="10" fill="#555" text-anchor="middle" dominant-baseline="middle">${escapeHtml(lab)}</text>`;
  }).join('');
  // data polygon
  const pts = values.map((v,i)=>{
    const p = toPoint(i, v);
    return `${p.x},${p.y}`;
  }).join(' ');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="readiness radar">
    <desc>Radar chart</desc>
    ${grid}
    ${axes}
    <polygon points="${pts}" fill="rgba(39, 174, 96, 0.25)" stroke="#27ae60" stroke-width="2" />
  </svg>`;
}

function renderIssues(issues?: string[]) {
  if (!issues || !issues.length) return '';
  return ` — Issues: ${issues.map(escapeHtml).join('; ')}`;
}

function renderRec(rec?: string) {
  if (!rec) return '';
  return ` — <em>${escapeHtml(rec)}</em>`;
}

function escapeHtml(s: string) {
  return String(s || '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'} as any)[c] || c);
}
