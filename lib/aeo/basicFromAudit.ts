import { AuditBundle } from './auditBundle';

export function buildBasicSectionFromAudit(audit: AuditBundle): string {
  const home = audit.pages[0];
  const title = home?.title || '';
  const meta = home?.metaDescription || '';
  const h1s = (home?.h1 || []).join(', ');
  const status = home?.status != null ? String(home.status) : 'NA';
  const wordCount = home?.wordCount ?? 0;

  return `
    <div class="card">
      <h3>Page Summary</h3>
      <p><strong>URL:</strong> ${escapeHtml(home?.url || audit.url)}</p>
      <p><strong>Status:</strong> ${escapeHtml(status)}</p>
      <p><strong>Title:</strong> ${escapeHtml(title)}</p>
      <p><strong>Meta description:</strong> ${escapeHtml(meta)}</p>
      <p><strong>H1:</strong> ${escapeHtml(h1s || '—')}</p>
      <p><strong>Word count:</strong> ${wordCount}</p>
    </div>
    <div class="card">
      <h3>Site Metrics</h3>
      <ul>
        <li>Total pages: ${audit.summary.totalPages}</li>
        <li>Missing titles: ${audit.summary.missingTitles}</li>
        <li>Missing meta: ${audit.summary.missingMeta}</li>
        <li>Avg word count: ${audit.summary.avgWordCount}</li>
      </ul>
    </div>
  `;
}

function escapeHtml(s: string) { return String(s||'').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'} as any)[c] || c); }
