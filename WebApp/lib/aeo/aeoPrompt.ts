import { InsightsResult } from './insights';

export interface AEOPromptParams {
  customerName: string;
  url?: string;
}

export function buildAEOSection(data: InsightsResult, params: AEOPromptParams): string {
  const { customerName, url } = params;
  const items = data.insights.map(i => `<li><strong>${i.title}</strong> (${i.severity}) – ${i.description} <em>Fix:</em> ${i.recommendation}</li>`).join('');
  return `
    <section class="card">
      <h2>Answer Engine Optimization (AEO) Summary</h2>
      <p>Site: ${url ?? customerName}</p>
      <p>AEO aims to make your content directly answer user questions in AI and SERP snippets.</p>
      <ul>${items || '<li>No major AEO blockers detected.</li>'}</ul>
      <p>Recommendations: Structure content with clear headings (H2/H3), provide concise answers, add FAQ schema where appropriate, and ensure fast performance.</p>
    </section>
  `;
}
