import * as cheerio from 'cheerio';

export async function buildBasicReport(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'FireGEO-AuditBot/1.0' } });
  const html = await res.text();
  const $ = cheerio.load(html);
  const title = $('title').first().text().trim();
  const meta = $('meta[name="description"]').attr('content')?.trim() || '';
  const h1 = $('h1').map((_, el) => $(el).text().trim()).get();

  return `
    <section class="card">
      <h2>Basic SEO Summary</h2>
      <p><strong>Title:</strong> ${escapeHtml(title)}</p>
      <p><strong>Meta description:</strong> ${escapeHtml(meta)}</p>
      <p><strong>H1:</strong> ${h1.map(escapeHtml).join(', ') || '—'}</p>
    </section>
  `;
}

function escapeHtml(s: string) { return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'} as any)[c]); }
