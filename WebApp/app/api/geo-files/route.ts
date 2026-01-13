import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { brandprofile, files } from '@/lib/db/schema';

const GEO_WEBHOOK_URL =
  process.env.WEBHOOK_URL ||
  '';
type CompetitorInput = string | { name?: string; title?: string };

function normalizeUrl(rawUrl: string | null): string {
  if (!rawUrl) {
    return '';
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

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

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const brandId = body?.brandId;
    const brandNameInput = body?.brandName;
    const urlInput = body?.url;

    let brandName = '';
    let brandUrl = '';
    let competitors: string[] = [];

    if (brandId && typeof brandId === 'string') {
      const [brand] = await db
        .select()
        .from(brandprofile)
        .where(and(eq(brandprofile.id, brandId), eq(brandprofile.userId, session.user.id)))
        .limit(1);

      if (!brand) {
        return NextResponse.json(
          { error: 'Brand not found' },
          { status: 404 },
        );
      }

      brandUrl = normalizeUrl(brand.url);
      brandName = brand.name;
      competitors = extractCompetitors(brand.scrapedData);
    } else if (brandNameInput && urlInput) {
      brandName = brandNameInput.trim();
      brandUrl = normalizeUrl(urlInput);
    } else {
       return NextResponse.json(
        { error: 'Either brandId OR (brandName and url) is required' },
        { status: 400 },
      );
    }

    if (!brandUrl) {
      return NextResponse.json(
        { error: 'Valid URL is required' },
        { status: 422 },
      );
    }

    console.log(brandUrl)

    const [fileRecord] = await db
      .insert(files)
      .values({
        userId: session.user.id,
        userEmail: session.user.email || '',
        brand: brandName,
        url: brandUrl,
      })
      .returning();

    if (!fileRecord) {
      throw new Error('Failed to create files record');
    }

    const payload = {
      flow: 2,
      id: fileRecord.id,
      brandName: brandName,
      brandUrl: brandUrl,
      competitors,
    };
    

    if (!GEO_WEBHOOK_URL) {
      console.warn('[geo-files] GEO_WEBHOOK_URL is not configured. Skipping webhook call.');
    } else {
      const webhookRes = await fetch(GEO_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!webhookRes.ok) {
        const text = await webhookRes.text().catch(() => 'Webhook failed');
        throw new Error(`Webhook responded with ${webhookRes.status}: ${text}`);
      }
    }

    return NextResponse.json({
      success: true,
      fileId: fileRecord.id,
      payload,
    });
  } catch (error) {
    console.error('[geo-files] Failed to trigger GEO webhook', error);
    return NextResponse.json(
      { error: 'Failed to trigger GEO workflow' },
      { status: 500 },
    );
  }
}
