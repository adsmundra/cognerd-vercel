import { NextResponse } from 'next/server';
import { parse } from 'node-html-parser';
import { generateText } from 'ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getProviderModel, PROVIDER_CONFIGS } from '@/lib/provider-config';
import { pool } from '@/lib/db';
import { auth } from '@/lib/auth';

const GEMINI_DEFAULT_MODEL = 'google/gemini-2.0-flash';
const MAX_TOKENS = process.env.MAX_TOKENS ? Number(process.env.MAX_TOKENS) : 2000;

async function fetchHtml(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CompanyBlogger/1.0)' },
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return await res.text();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

function extractFromHtml(html: string, url: string) {
  const root = parse(html);

  let brandName: string | null = null;
  const ogSiteName = root.querySelector('meta[property="og:site_name"]');
  if (ogSiteName && ogSiteName.getAttribute('content')) brandName = ogSiteName.getAttribute('content')!.trim();
  else {
    const ogTitle = root.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.getAttribute('content')) brandName = ogTitle.getAttribute('content')!.trim();
    else if (root.querySelector('title')) brandName = root.querySelector('title')!.text.trim();
  }

  let email: string | null = null;
  const mailAnchors = root.querySelectorAll('a[href^="mailto:"]');
  if (mailAnchors && mailAnchors.length > 0) {
    for (const a of mailAnchors) {
      const href = a.getAttribute('href');
      if (!href) continue;
      const candidate = href.replace(/^mailto:/i, '').split('?')[0].trim();
      if (candidate) { email = candidate; break; }
    }
  } else {
    const bodyText = root.text;
    const match = bodyText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (match) email = match[0];
  }

  const paragraphs = root.querySelectorAll('p').slice(0, 60);
  const pText = paragraphs.map(p => p.text.trim()).filter(Boolean).join('\n\n');

  let metaDesc = '';
  const metaDescription = root.querySelector('meta[name="description"]') || root.querySelector('meta[property="og:description"]');
  if (metaDescription && metaDescription.getAttribute('content')) metaDesc = metaDescription.getAttribute('content')!.trim();

  const content = [metaDesc, pText].filter(Boolean).join('\n\n');

  if (!brandName) {
    try {
      const u = new URL(url);
      brandName = u.hostname.replace(/^www\./, '');
    } catch {
      brandName = url;
    }
  }

  return { brandName, email, content };
}

async function ensureTable() {
  const createSQL = `
    CREATE TABLE IF NOT EXISTS blogs (
      id SERIAL PRIMARY KEY,
      company_url TEXT NOT NULL,
      email_id TEXT,
      brand_name TEXT,
      blog TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `;
  await pool.query(createSQL);
  // Ensure topic column exists on legacy tables
  await pool.query('ALTER TABLE blogs ADD COLUMN IF NOT EXISTS topic TEXT');
}

async function generateBlog({ topic, brandName, scrapedContent, providedEmail, providedBrand }: {
  topic: string; brandName: string | null; scrapedContent: string; providedEmail: string | null; providedBrand?: string | null;
}) {
  const systemPrompt = `You are a professional content writer focusing on helpful, accurate, and SEO-friendly blogs. Use only the facts provided in "Scraped Content" and the brand information the user has provided. If information is missing, you may add minimal general context but mark it as generic at the end. Output the blog in Markdown. Start with a "Meta Description" heading (one or two sentences).`;

  const userPrompt = `
Topic: ${topic}
Brand (provided): ${providedBrand || brandName}
Email (provided): ${providedEmail || 'N/A'}

Scraped Content (use this as source facts):
${(scrapedContent || '').slice(0, 12000)}

Write a comprehensive, well-structured blog post for "${providedBrand || brandName}" about "${topic}". Use headings, bullets/lists where useful, and include an "Conclusion" section. If you added any generic info, append a short line "Note: generic information added." at the end.
  Cite specific scraped facts inline using [source].
`;

  const model = getProviderModel('google', GEMINI_DEFAULT_MODEL);
  if (!model) throw new Error('Gemini model not available or API key not configured');

  const { text } = await generateText({
    model,    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0,
    maxTokens: Math.min(MAX_TOKENS, 4000)
  });

  if (!text) throw new Error('AI returned empty response');
  return text;
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Server misconfiguration: missing DATABASE_URL' }, { status: 500 });
    }

    const body = await request.json();
    const { company_url, topic, brand_name: providedBrand, email_id: providedEmail } = body ?? {} as any;

    if (!company_url || !topic) {
      return NextResponse.json({ error: 'Missing required fields: company_url and topic' }, { status: 400 });
    }

    let html: string;
    try {
      html = await fetchHtml(company_url);
    } catch (err: any) {
      return NextResponse.json({ error: `Failed to fetch company_url: ${err.message}` }, { status: 400 });
    }

    const { brandName: scrapedBrand, email: scrapedEmail, content: scrapedContent } = extractFromHtml(html, company_url);
    const finalBrand = providedBrand || scrapedBrand;
    let finalEmail = providedEmail || scrapedEmail || null;

    // Prefer session email if available
    try {
      // @ts-ignore - NextRequest type not available here; using any headers
      const session = await auth.api.getSession({ headers: (request as any).headers });
      const sessionEmail = session?.user?.email || null;
      if (sessionEmail) finalEmail = sessionEmail;
    } catch {}


    await ensureTable();

    let blogText: string;
    try {
      console.log("Generating blog for:", finalBrand, "on topic:", topic);
      blogText = await generateBlog({
        topic,
        brandName: scrapedBrand,
        scrapedContent,
        providedEmail: finalEmail,
        providedBrand: providedBrand,
      });
    } catch (err: any) {
      console.error('AI error:', err);
      return NextResponse.json({ error: 'AI generation failed', detail: err.message ?? String(err) }, { status: 500 });
    }

    const insertSQL = `
      INSERT INTO blogs (company_url, email_id, brand_name, topic, blog)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at;
    `;
    const values = [company_url, finalEmail, finalBrand, topic, blogText];
    const resIns = await pool.query(insertSQL, values);
    const row = resIns.rows[0];

    return NextResponse.json({
      id: row.id,
      created_at: row.created_at,
      blog: blogText,
      topic,
    }, { status: 201 });
  } catch (err: any) {
    console.error('Unexpected error in API:', err);
    return NextResponse.json({ error: 'Internal server error', detail: String(err) }, { status: 500 });
  }
}
