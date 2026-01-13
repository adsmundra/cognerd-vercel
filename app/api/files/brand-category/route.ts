import { NextRequest } from 'next/server';
import { getFilesCollection } from '@/lib/mongo';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { brand, category } = await req.json();
    if (!brand && !category) {
      return new Response('brand or category required', { status: 400 });
    }
    const col = await getFilesCollection();

    // Fetch latest doc
    const latest = await col.find({}).sort({ _id: -1 }).limit(1).next();
    if (latest) {
      await col.updateOne({ _id: latest._id }, { $set: { brand: brand ?? latest.brand ?? null, category: category ?? latest.category ?? null, updatedAt: new Date() } });
      return Response.json({ ok: true, brand: brand ?? latest.brand ?? null, category: category ?? latest.category ?? null });
    } else {
      const doc = { brand: brand ?? null, category: category ?? null, createdAt: new Date(), source: 'brand-category' } as any;
      const ins = await col.insertOne(doc);
      return Response.json({ ok: true, id: ins.insertedId, brand: doc.brand, category: doc.category });
    }
  } catch (e: any) {
    return new Response(e?.message || 'Internal error', { status: 500 });
  }
}

export async function GET() {
  const col = await getFilesCollection();
  const latest = await col.find({}).sort({ _id: -1 }).limit(1).next();
  if (!latest) return Response.json({ brand: null, category: null });
  return Response.json({ brand: latest.brand ?? null, category: latest.category ?? null });
}
