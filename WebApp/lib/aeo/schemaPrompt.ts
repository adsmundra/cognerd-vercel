export interface SchemaParams {
  customerName: string;
  url?: string;
}

export function buildSchemaSection(params: SchemaParams): string {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: params.customerName,
    url: params.url || undefined,
  };
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: params.customerName,
    url: params.url || undefined,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${params.url || ''}/?s={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };

  return `
    <section class="card">
      <h2>Schema Suggestions</h2>
      <p>Add the following JSON-LD to your pages as appropriate.</p>
      <h3>Organization</h3>
      <pre>${escapeHtml(JSON.stringify(org, null, 2))}</pre>
      <h3>WebSite</h3>
      <pre>${escapeHtml(JSON.stringify(website, null, 2))}</pre>
    </section>
  `;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'} as any)[c]);
}
