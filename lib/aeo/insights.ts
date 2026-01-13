import { CrawlResult } from './crawl';

export interface MetricSummary {
  totalPages: number;
  okPages: number;
  errorPages: number;
  avgResponseMs: number;
  missingTitles: number;
  missingMeta: number;
  avgWordCount: number;
  statusBuckets: Record<string, number>;
}

export interface Insight {
  title: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

export interface InsightsResult {
  metrics: MetricSummary;
  insights: Insight[];
}

export function summarize(result: CrawlResult): InsightsResult {
  const metrics: MetricSummary = {
    totalPages: result.pages.length,
    okPages: 0,
    errorPages: 0,
    avgResponseMs: 0,
    missingTitles: 0,
    missingMeta: 0,
    avgWordCount: 0,
    statusBuckets: {}
  };

  let totalMs = 0;
  let totalWords = 0;

  for (const p of result.pages) {
    const key = String(p.status ?? 'NA');
    metrics.statusBuckets[key] = (metrics.statusBuckets[key] || 0) + 1;
    if (p.ok) metrics.okPages += 1; else metrics.errorPages += 1;
    if (!p.title) metrics.missingTitles += 1;
    if (!p.metaDescription) metrics.missingMeta += 1;
    if (p.timeMs) totalMs += p.timeMs;
    if (p.wordCount) totalWords += p.wordCount;
  }

  metrics.avgResponseMs = result.pages.length ? Math.round(totalMs / result.pages.length) : 0;
  metrics.avgWordCount = result.pages.length ? Math.round(totalWords / result.pages.length) : 0;

  const percent = (n: number) => (metrics.totalPages ? Math.round((n / metrics.totalPages) * 100) : 0);

  const insights: Insight[] = [];
  if (percent(metrics.missingTitles) > 10) {
    insights.push({
      title: 'Missing or empty <title> tags',
      severity: 'high',
      description: `${metrics.missingTitles} pages (${percent(metrics.missingTitles)}%) lack titles, reducing relevance and CTR.`,
      recommendation: 'Add concise, keyword-rich titles unique to each page (50–60 chars).'
    });
  }
  if (percent(metrics.missingMeta) > 20) {
    insights.push({
      title: 'Missing meta descriptions',
      severity: 'medium',
      description: `${metrics.missingMeta} pages (${percent(metrics.missingMeta)}%) have no meta description.`,
      recommendation: 'Provide compelling 140–160 char descriptions to improve SERP CTR.'
    });
  }
  if (metrics.avgResponseMs > 1500) {
    insights.push({
      title: 'High average response time',
      severity: 'medium',
      description: `Average TTFB ~${metrics.avgResponseMs}ms across pages.`,
      recommendation: 'Enable caching/CDN, optimize server/rendering, compress assets.'
    });
  }
  if (metrics.avgWordCount < 250) {
    insights.push({
      title: 'Low average word count',
      severity: 'low',
      description: `Avg word count is ${metrics.avgWordCount}.`,
      recommendation: 'Enrich content to better cover topics and match user intent.'
    });
  }

  return { metrics, insights };
}
