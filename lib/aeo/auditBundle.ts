import { crawlSite, CrawlResult } from './crawl';

export interface AuditOptions {
  maxPages?: number;
}

export interface AuditBundle {
  url: string;
  pages: Array<{
    url: string;
    status: number | null;
    title?: string;
    metaDescription?: string;
    h1?: string[];
    canonical?: string | null;
    wordCount?: number;
  }>;
  summary: {
    totalPages: number;
    statusBuckets: Record<string, number>;
    missingTitles: number;
    missingMeta: number;
    avgWordCount: number;
  };
}

export async function buildAuditBundle(url: string, opts: AuditOptions = {}): Promise<AuditBundle> {
  const { maxPages = 20 } = opts;
  const crawl = await crawlSite({ startUrl: url, maxPages });
  const pages = crawl.pages.map(p => ({
    url: p.url,
    status: p.status ?? null,
    title: p.title,
    metaDescription: p.metaDescription,
    h1: p.h1,
    canonical: p.canonical ?? null,
    wordCount: p.wordCount
  }));

  const summary = {
    totalPages: pages.length,
    statusBuckets: pages.reduce((acc, p) => { const k = String(p.status ?? 'NA'); acc[k] = (acc[k]||0)+1; return acc; }, {} as Record<string, number>),
    missingTitles: pages.filter(p => !p.title).length,
    missingMeta: pages.filter(p => !p.metaDescription).length,
    avgWordCount: pages.length ? Math.round(pages.reduce((s, p) => s + (p.wordCount || 0), 0) / pages.length) : 0,
  };

  return { url, pages, summary };
}
