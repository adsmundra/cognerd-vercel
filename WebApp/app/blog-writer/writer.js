// app/api/generate-blog/route.js
import { NextResponse } from "next/server";
import { parse } from "node-html-parser";
import { generateText } from "ai";
import dotenv from "dotenv";
dotenv.config({ path: '.env.local' });

// Use centralized provider config and shared DB pool
import { getProviderModel, PROVIDER_CONFIGS } from "@/lib/provider-config";
import { pool } from "@/lib/db";

const OPENAI_DEFAULT_MODEL = PROVIDER_CONFIGS.anthropic?.defaultModel || "claude-4-sonnet-20250514";
const MAX_TOKENS = process.env.MAX_TOKENS ? Number(process.env.MAX_TOKENS) : 2000;

// Utility: fetch HTML from a URL with timeout
async function fetchHtml(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CompanyBlogger/1.0)"
      },
      signal: controller.signal
    });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    const text = await res.text();
    return text;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Extract brand fallback, email, and content from HTML
function extractFromHtml(html, url) {
  const root = parse(html);

  // brand (og:site_name, og:title, title)
  let brandName = null;
  const ogSiteName = root.querySelector('meta[property="og:site_name"]');
  if (ogSiteName && ogSiteName.getAttribute("content")) brandName = ogSiteName.getAttribute("content").trim();
  else {
    const ogTitle = root.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.getAttribute("content")) brandName = ogTitle.getAttribute("content").trim();
    else if (root.querySelector("title")) brandName = root.querySelector("title").text.trim();
  }

  // email: mailto or regex in page
  let email = null;
  const mailAnchors = root.querySelectorAll('a[href^="mailto:"]');
  if (mailAnchors && mailAnchors.length > 0) {
    for (const a of mailAnchors) {
      const href = a.getAttribute("href");
      if (!href) continue;
      const candidate = href.replace(/^mailto:/i, "").split("?")[0].trim();
      if (candidate) { email = candidate; break; }
    }
  } else {
    const bodyText = root.text;
    const match = bodyText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (match) email = match[0];
  }

  // gather paragraphs (limit to avoid huge context)
  const paragraphs = root.querySelectorAll("p").slice(0, 60);
  const pText = paragraphs.map(p => p.text.trim()).filter(Boolean).join("\n\n");

  // meta description
  let metaDesc = "";
  const metaDescription = root.querySelector('meta[name="description"]') || root.querySelector('meta[property="og:description"]');
  if (metaDescription && metaDescription.getAttribute("content")) metaDesc = metaDescription.getAttribute("content").trim();

  const content = [metaDesc, pText].filter(Boolean).join("\n\n");

  // fallback company brand to hostname
  if (!brandName) {
    try {
      const u = new URL(url);
      brandName = u.hostname.replace(/^www\./, "");
    } catch {
      brandName = url;
    }
  }

  return { brandName, email, content };
}

// Ensure table exists
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
}

// Generate blog using centralized AI provider config (OpenAI by default)
async function generateBlogWithOpenAI({ topic, brandName, scrapedContent, providedEmail, providedBrand }) {
  // Compose prompt
  const systemPrompt = `You are a professional content writer focusing on helpful, accurate, and SEO-friendly blogs. Use only the facts provided in "Scraped Content" and the brand information the user has provided. If information is missing, you may add minimal general context but mark it as generic at the end. Output the blog in Markdown. Start with a "Meta Description" heading (one or two sentences).`;
  const userPrompt = `
Topic: ${topic}
Brand (provided): ${providedBrand || brandName}
Email (provided): ${providedEmail || "N/A"}

Scraped Content (use this as source facts):
${(scrapedContent || "").slice(0, 12000)}

Write a comprehensive, well-structured blog post for "${providedBrand || brandName}" about "${topic}". Use headings, bullets/lists where useful, and include an "Conclusion" section. If you added any generic info, append a short line "Note: generic information added." at the end.
Cite specific scraped facts inline using [source].
`;

  // Get model from centralized provider config (OpenAI preferred)
  const model = getProviderModel('anthropic', OPENAI_DEFAULT_MODEL);
  console.log("Using model:", model);
  if (!model) {
    throw new Error('OpenAI model not available or API key not configured');
  }

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0,
    maxTokens: Math.min(MAX_TOKENS, 4000)
  });

  if (!text) throw new Error("AI returned empty response");
  return text;
}

export async function POST(request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Server misconfiguration: missing DATABASE_URL" }, { status: 500 });
    }
    // OpenAI key is validated via provider-config getProviderModel()

    const body = await request.json();
    const { company_url, topic, brand_name: providedBrand, email_id: providedEmail } = body ?? {};

    if (!company_url || !topic) {
      return NextResponse.json({ error: "Missing required fields: company_url and topic" }, { status: 400 });
    }

    // 1) fetch HTML
    let html;
    try {
      html = await fetchHtml(company_url);
    } catch (err) {
      return NextResponse.json({ error: `Failed to fetch company_url: ${err.message}` }, { status: 400 });
    }

    // 2) parse
    const { brandName: scrapedBrand, email: scrapedEmail, content: scrapedContent } = extractFromHtml(html, company_url);

    // Prefer provided brand/email over scraped ones
    const finalBrand = providedBrand || scrapedBrand;
    const finalEmail = providedEmail || scrapedEmail || null;

    // 3) ensure DB table
    await ensureTable();

    // 4) produce blog using OpenAI
    let blogText;
    try {
      blogText = await generateBlogWithOpenAI({
        topic,
        brandName: scrapedBrand,
        scrapedContent,
        providedEmail: finalEmail,
        providedBrand: providedBrand
      });
    } catch (err) {
      console.error("OpenAI error:", err);
      return NextResponse.json({ error: "OpenAI generation failed", detail: err.message ?? String(err) }, { status: 500 });
    }

    // 5) insert to DB
    const insertSQL = `
      INSERT INTO blogs (company_url, email_id, brand_name, blog)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at;
    `;
    const values = [company_url, finalEmail, finalBrand, blogText];
    const res = await pool.query(insertSQL, values);
    const row = res.rows[0];

    // 6) respond with saved id and the blog text
    return NextResponse.json({
      id: row.id,
      created_at: row.created_at,
      blog: blogText
    }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error in API:", err);
    return NextResponse.json({ error: "Internal server error", detail: String(err) }, { status: 500 });
  }
}
