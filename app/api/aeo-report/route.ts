import { NextRequest, NextResponse } from 'next/server';
import { buildAuditBundle } from '../../../lib/aeo/auditBundle';
import { renderAeoJsonToHtml, AeoModelOutput } from '../../../lib/aeo/aeoReportFromPrompt';
import { renderSchemaAuditToHtml, SchemaAuditOutput } from '../../../lib/aeo/schemaReportFromPrompt';
import { buildBasicSectionFromAudit } from '../../../lib/aeo/basicFromAudit';
import { callLLMJSON } from '../../../lib/providers/llm';
import { SCHEMA_AUDIT_PROMPT } from '../../../lib/aeo/prompts/schemaAuditPrompt';
import { db } from '../../../lib/db';
import { aeoReports, notifications, brandprofile } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '../../../lib/auth';
import { Autumn } from 'autumn-js';
import { InsufficientCreditsError, ExternalServiceError, handleApiError } from '@/lib/api-errors';

interface AEOReportRequest {
  url: string;
  customerName?: string;
  maxPages?: number;
  competitors?: any[];
}

type CompetitorInput = string | { name?: string; title?: string };

function extractCompetitors(scrapedData: any): string[] {
  if (!scrapedData) return [];

  const sources: CompetitorInput[][] = [
    Array.isArray(scrapedData?.competitors) ? scrapedData.competitors : [],
    Array.isArray(scrapedData?.topCompetitors) ? scrapedData.topCompetitors : [],
    Array.isArray(scrapedData?.competitorList) ? scrapedData.competitorList : [],
  ];

  const set = new Set<string>();

  for (const list of sources) {
    for (const entry of list) {
      if (!entry) continue;
      if (typeof entry === 'string') {
        const value = entry.trim();
        if (value) set.add(value);
        continue;
      }
      const name = entry.name || entry.title;
      if (typeof name === 'string') {
        const trimmed = name.trim();
        if (trimmed) set.add(trimmed);
      }
    }
  }

  return Array.from(set);
}

function deriveCustomerNameFromUrl(u: string): string {
  try {
    const { hostname } = new URL(u);
    const base = hostname.replace(/^www\./, '');
    const name = base.split('.')[0] || 'client';
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'Client';
  }
}

const AUDITOR_PROMPT_PREFIX = `You are an expert AEO (Answer Engine Optimization) auditor assistant. I will provide the extracted content of one or more webpages, including:
- Headings, paragraphs, lists
- Images with alt text or captions
- Structured data (JSON-LD, Microdata, RDFa)
- Optional: metadata like title, meta description
Your task is to produce a **comprehensive, human-readable, structured JSON report per page** that is easy for a non-technical person to understand.
FOR EACH PAGE, OUTPUT:
{
  "url": "...",
  "structuredContent": [
    {
      "type": "FAQPage|HowTo|Article|Product|Service|Review|Person|Organization|Breadcrumb",
      "textOrSummary": "...",
      "status": "valid|missing|incorrect",
      "issues": ["..."],
      "recommendedChanges": "..."
    }
  ],
  "unstructuredContent": [
    {
      "contentType": "paragraph|heading|list|image",
      "textOrAlt": "...",
      "suggestedAeoType": "FAQPage|HowTo|Article|Product|Service|Review|Person|Organization|Breadcrumb",
      "reasonItIsImportant": "...",
      "recommendation": "markup it with JSON-LD / optimize for AEO/GEO"
    }
  ],
  "optimizationSuggestions": [
    {
      "existingContent": "...",
      "problem": "too generic / missing schema / poor snippet / missing alt text",
      "suggestedFix": "..."
    }
  ],
  "newContentRecommendations": [
    {
      "contentType": "paragraph|heading|list|image",
      "suggestedTopicOrText": "...",
      "aeoType": "FAQPage|HowTo|Article|Product|Service|Review|Person|Organization|Breadcrumb",
      "reasonForAdding": "..."
    }
  ],
  "summaryScore": {
      "structuredCoverage": 0-100,
      "unstructuredCoverage": 0-100,
      "optimizationOpportunities": 0-100,
      "overallAEOReadiness": 0-100
  }
}
RULES:
1. Do NOT invent facts. Use placeholders like COMPANY_NAME, SERVICE_NAME if information is missing.
2. Identify **all content relevant for AEO**, whether structured or unstructured.
3. Clearly separate **already structured content**, **unstructured but AEO-relevant content**, **content that needs optimization**, and **suggested new content**.
4. Provide concise explanations for each recommendation so a **non-technical person** can understand.
5. Include JSON-LD validation hints for each structured block (e.g., "validate with Google Rich Results Test").
6. Keep output **strictly valid JSON**, no extra text, commentary, or formatting outside the JSON.`;

export async function POST(request: NextRequest) {
  try {
    const body: AEOReportRequest = await request.json();
    const { url, maxPages = 5, competitors = [] } = body;
    let { customerName } = body;
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Get session via Better Auth
    let userId: string | null = null;
    let userEmail: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: request.headers as any });
      if (session?.user) {
        userId = session.user.id || null;
        userEmail = session.user.email || null;
      }
    } catch {}

    // Enforce credits via Autumn
    const REQUIRED_CREDITS = 30;
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Extract competitors from existing brand profile if available
    let extractedCompetitors: string[] = [];
    try {
        const [brand] = await db
          .select()
          .from(brandprofile)
          .where(eq(brandprofile.url, url)) 
          .limit(1);
        
        if (brand) {
          extractedCompetitors = extractCompetitors(brand.scrapedData);
        }
    } catch (e) {
      console.warn('Failed to lookup brand profile for competitors:', e);
    }

    // Normalize customerName for consistency
    if (!customerName || !customerName.trim()) customerName = deriveCustomerNameFromUrl(url);
    customerName = customerName.trim();
    customerName = customerName
      .split(/\s+/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const autumn = new Autumn({ apiKey: process.env.AUTUMN_SECRET_KEY! });
    // Unique per-run idempotency base to ensure every click deducts 30
    const runId = (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const idempotencyKey = `${userId}:aeo:${runId}`;

    // Check allowance
    try {
      const access = await autumn.check({ customer_id: userId, feature_id: 'messages' });
      const balance = access.data?.balance || 0;
      const allowed = access.data?.allowed || false;
      if (!allowed || balance < REQUIRED_CREDITS) {
        const err = new InsufficientCreditsError('Insufficient credits for AEO report generation', { required: REQUIRED_CREDITS, available: balance });
        return NextResponse.json(handleApiError(err), { status: err.statusCode });
      }
    } catch (err) {
      console.error('[AEO] Credit check error:', err);
      const apiErr = new ExternalServiceError('Unable to verify credits. Please try again', 'autumn');
      return NextResponse.json(handleApiError(apiErr), { status: apiErr.statusCode });
    }

    // Deduct credits: 30 single-unit idempotent calls
    try {
      for (let i = 0; i < REQUIRED_CREDITS; i++) {
        await autumn.track({
          customer_id: userId,
          feature_id: 'messages',
          usage: 1,
          idempotency_key: `${idempotencyKey}:${i}`,
          metadata: { type: 'AEO_REPORT', url, customerName, part: i + 1 }
        });
      }
    } catch (err) {
      console.error('[AEO] Credit deduction error (loop):', err);
      const apiErr = new ExternalServiceError('Unable to deduct credits. Please try again', 'autumn');
      return NextResponse.json(handleApiError(apiErr), { status: apiErr.statusCode });
    }

    // Insert into DB with empty HTML
    let insertedReport;
    try {
      insertedReport = await db.insert(aeoReports).values({
        userId,
        userEmail,
        customerName,
        url,
        html: null,
        read: false,
      }).returning({ id: aeoReports.id });
    } catch (e) {
      console.error('Failed to insert aeo_report:', e);
      return NextResponse.json({ error: 'Failed to initiate AEO report generation' }, { status: 500 });
    }

    const id = insertedReport[0]?.id;
    if (!id) {
      return NextResponse.json({ error: 'Failed to get report ID after insertion' }, { status: 500 });
    }

    const payload ={
      id,
      brandUrl:url,
      brandName: customerName,
      flow: 1,
      competitors: [...new Set([...competitors, ...extractedCompetitors])]
    }

    console.log(payload);
    // Send data to webhook
    try {
      await fetch(process.env.WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('Failed to send webhook for aeo_report:', e);
    }

    // Insert notification entry
    try {
      await db.insert(notifications).values({
        userId,
        userEmail,
        type: 'aeo_report_generated',
        message: `Your AEO report for ${customerName} is being generated. We will notify you when it's ready.`,
        link: `/brand-monitor?tab=aeo&id=${id}`,
        status: 'not_sent',
        read: false,
        assetId: id,
        assetTable: 'aeo_reports',
      });
    } catch (e) {
      console.error('Failed to insert notification for aeo_report:', e);
    }

    return NextResponse.json({
      success: true,
      message: "AEO report generation initiated. We will notify you when the report is ready.",
      reportId: id,
    });
  } catch (error) {
    console.error('AEO Report generation error (combined flows):', error);
    return NextResponse.json({ error: 'Failed to generate AEO report', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// Keep GET for basic quick summary
import { buildBasicReport } from '../../../lib/aeo/basicReport';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    const customerName = deriveCustomerNameFromUrl(url);
    const htmlContent = await buildBasicReport(url);
    return NextResponse.json({ success: true, htmlContent, customerName, reportType: 'basic' });
  } catch (error) {
    console.error('AEO Report retrieval error:', error);
    return NextResponse.json({ error: 'Failed to retrieve AEO report', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

function escapeHtml(s: string) { return String(s||'').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'} as any)[c] || c); }

function extractFirstJsonValue(raw: string): string {
  let s = String(raw ?? '').trim();

  // Strip BOM
  if (s.length && s.charCodeAt(0) === 0xFEFF) s = s.slice(1);

  // Strip markdown code fences like ```json ... ``` or ``` ... ```
  if (s.startsWith('```')) {
    const firstLineEnd = s.indexOf('\n');
    if (firstLineEnd !== -1) {
      const fenceLang = s.slice(3, firstLineEnd).trim().toLowerCase();
      if (fenceLang === '' || fenceLang === 'json') {
        s = s.slice(firstLineEnd + 1);
        const closing = s.lastIndexOf('```');
        if (closing !== -1) {
          s = s.slice(0, closing);
        }
      }
    }
    s = s.trim();
  }

  // Find first non-whitespace
  let i = 0;
  while (i < s.length && /\s/.test(s[i])) i++;
  if (i >= s.length) return s;

  // Ensure we start at '{' or '['
  let startIdx = i;
  if (s[startIdx] !== '{' && s[startIdx] !== '[') {
    const jObj = s.indexOf('{', startIdx);
    const jArr = s.indexOf('[', startIdx);
    const j = (jObj === -1) ? jArr : (jArr === -1 ? jObj : Math.min(jObj, jArr));
    if (j === -1) return s.trim();
    startIdx = j;
  }

  const openChar = s[startIdx];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let k = startIdx; k < s.length; k++) {
    const ch = s[k];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === openChar) depth++;
    else if (ch === closeChar) depth--;

    if (depth === 0) {
      return s.slice(startIdx, k + 1).trim();
    }
  }

  // Unclosed JSON, return what we have (will still throw on parse)
  return s.slice(startIdx).trim();
}
