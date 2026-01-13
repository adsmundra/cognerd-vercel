import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fileGenerationJobs } from '@/lib/db/schema.files';
import { eq } from 'drizzle-orm';
import { getFilesCollection } from '@/lib/mongo';

export const runtime = 'nodejs';

function sanitizeUuid(raw: any): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/[\u0000-\u001F\u007F]/g, '');
  const ok = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
  return ok ? s : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawJobId = body?.jobId;
    const jobId = sanitizeUuid(rawJobId);
    if (!jobId) return NextResponse.json({ error: 'Missing or invalid jobId' }, { status: 400 });

    // Fetch the document from MongoDB for this jobId
    const col = await getFilesCollection<any>();
    const doc = await col.findOne({ jobId });

    if (!doc) {
      // If no doc found, mark failed (optional) or just update status if provided
      const updates: any = { updatedAt: new Date() };
      if (body?.status) updates.status = body.status;
      if (body?.error) updates.error = String(body.error);
      await db.update(fileGenerationJobs).set(updates).where(eq(fileGenerationJobs.id, jobId));
      return NextResponse.json({ ok: true, note: 'No Mongo doc found for jobId' });
    }

    // Build virtual files array from Mongo fields
    const virtualFiles = [] as Array<{ name: string; url: string; size?: number | null; createdAt?: Date | null }>;

    const names: Array<{ name: string; field: keyof any; contentType: string }> = [
      { name: 'llm.txt', field: 'llm', contentType: 'text/plain; charset=utf-8' },
      { name: 'robots.txt', field: 'robots', contentType: 'text/plain; charset=utf-8' },
      { name: 'schema.org', field: 'schema', contentType: 'application/ld+json; charset=utf-8' },
      { name: 'faq.txt', field: 'faq', contentType: 'text/plain; charset=utf-8' },
    ];

    for (const item of names) {
      const content = (doc as any)?.[item.field];
      if (content != null) {
        virtualFiles.push({
          name: item.name,
          url: `/api/files/download?jobId=${encodeURIComponent(jobId)}&name=${encodeURIComponent(item.name)}`,
          size: typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : Buffer.byteLength(JSON.stringify(content)),
          createdAt: new Date(),
        });
      }
    }

    // Update the Postgres job to completed and store files list in result
    const updates: any = {
      status: 'completed',
      result: { files: virtualFiles },
      updatedAt: new Date(),
      error: null,
    };

    await db.update(fileGenerationJobs).set(updates).where(eq(fileGenerationJobs.id, jobId));

    return NextResponse.json({ ok: true, files: virtualFiles });
  } catch (e: any) {
    console.error('[files/callback] error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
