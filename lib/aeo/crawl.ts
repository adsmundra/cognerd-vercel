import * as cheerio from 'cheerio';

export interface CrawlOptions {
  startUrl: string;
  domainRegex?: RegExp;
  maxPages?: number;
  timeoutMs?: number;
}

export interface PageResult {
  url: string;
  status: number | null;
  ok: boolean;
  timeMs: number | null;
  title?: string;
  metaDescription?: string;
  h1?: string[];
  h2?: string[];
  wordCount?: number;
  links?: string[];
  canonical?: string | null;
}

export interface CrawlResult {
  pages: PageResult[];
}

function sameSite(url: URL, candidate: URL, domainRegex?: RegExp) {
  if (domainRegex) {
    return domainRegex.test(candidate.hostname);
  }
  return url.hostname === candidate.hostname;
}

export async function crawlSite(opts: CrawlOptions): Promise<CrawlResult> {
  const { startUrl, domainRegex, maxPages = 50, timeoutMs = 8000 } = opts;
  const start = new URL(startUrl);
  const q: string[] = [start.href];
  const seen = new Set<string>();
  const results: PageResult[] = [];

  while (q.length && results.length < maxPages) {
    const current = q.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);

    let res: Response | null = null;
    let status: number | null = null;
    let ok = false;
    let timeMs: number | null = null;
    let html = '';
    const t0 = Date.now();

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      res = await fetch(current, { signal: controller.signal, redirect: 'follow' as RequestRedirect, headers: { 'User-Agent': 'FireGEO-AuditBot/1.0' } });
      clearTimeout(id);
      status = res.status;
      ok = res.ok;
      if (res.headers.get('content-type')?.includes('text/html')) {
        html = await res.text();
      }
    } catch (e) {
      // keep null fields
    } finally {
      timeMs = Date.now() - t0;
    }

    const page: PageResult = { url: current, status, ok, timeMs };

    if (html) {
      const $ = cheerio.load(html);
      page.title = $('title').first().text().trim();
      page.metaDescription = $('meta[name="description"]').attr('content')?.trim();
      page.h1 = $('h1').map((_, el) => $(el).text().trim()).get();
      page.h2 = $('h2').map((_, el) => $(el).text().trim()).get();
      page.canonical = $('link[rel="canonical"]').attr('href') || null;
      const text = $('body').text().replace(/\s+/g, ' ').trim();
      page.wordCount = text ? text.split(' ').length : 0;

      const links = $('a[href]')
        .map((_, el) => $(el).attr('href')!)
        .get()
        .filter(Boolean)
        .map(href => {
          try { return new URL(href, current).href; } catch { return null; }
        })
        .filter(Boolean) as string[];
      page.links = links;

      // enqueue same-site links only
      for (const l of links) {
        try {
          const u = new URL(l);
          if (sameSite(start, u, domainRegex)) q.push(u.href);
        } catch {}
      }
    }

    results.push(page);
  }

  return { pages: results };
}
