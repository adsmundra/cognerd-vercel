import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { files } from '@/lib/db/schema.files';
import { desc, eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const brandFilter = searchParams.get('brand');

    let query = db
      .select({
        id: files.id,
        brand: files.brand,
        url: files.url,
        createdAt: files.createdAT,
      })
      .from(files)
      .where(eq(files.userId, session.user.id))
      .orderBy(desc(files.createdAT))
      .$dynamic();

    if (brandFilter) {
      query = db
        .select({
          id: files.id,
          brand: files.brand,
          url: files.url,
          createdAt: files.createdAT,
        })
        .from(files)
        .where(and(eq(files.userId, session.user.id), eq(files.brand, brandFilter)))
        .orderBy(desc(files.createdAT))
        .$dynamic();
    }

    const userFiles = await query;

    return NextResponse.json({ files: userFiles });
  } catch (error) {
    console.error('Error fetching file history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}