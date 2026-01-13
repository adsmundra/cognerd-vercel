import { NextRequest } from 'next/server';
import { getFilesCollection, mapNameToField, VirtualFileName } from '@/lib/mongo';

export const runtime = 'nodejs';

function sanitizeUuid(raw: any): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/[\u0000-\u001F\u007F]/g, '');
  const ok = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
  return ok ? s : null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name') as VirtualFileName | null;
  const rawJobId = searchParams.get('jobId');
  const jobId = sanitizeUuid(rawJobId);

  if (!name || !['llm.txt','robots.txt','schema.org','faq.txt'].includes(name)) {
    return new Response('Invalid file name', { status: 400 });
  }
  if (!jobId) {
    return new Response('Missing or invalid jobId', { status: 400 });
  }

  const col = await getFilesCollection();
  const doc = await col.findOne({ jobId });
  if (!doc) return new Response('Not found', { status: 404 });

  const field = mapNameToField(name) as 'llm'|'robots'|'schema'|'faq';
  const content = (doc as any)[field] ?? '';
  const body = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  let contentType = 'text/plain; charset=utf-8';
  if (name === 'schema.org') contentType = 'application/ld+json; charset=utf-8';

  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store'
    }
  });
}
