import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aeoReports } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    let userId: string | null = null;
    let userEmail: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: request.headers as any });
      if (session?.user) {
        userId = session.user.id || null;
        userEmail = session.user.email || null;
      }
    } catch {}

    if (!userId && !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(aeoReports)
      .where(and(eq(aeoReports.id, id), (userId ? eq(aeoReports.userId, userId) : eq(aeoReports.userEmail, userEmail!))))
      .limit(1);

    const row = rows[0];
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Mark report as read
    if (!row.read) {
      await db.update(aeoReports)
        .set({ read: true })
        .where(eq(aeoReports.id, id));
    }

    return NextResponse.json({ id: row.id, customerName: row.customerName, url: row.url, html: row.html, createdAt: row.createdAt, read: true });
  } catch (e) {
    console.error('Failed to view AEO report', e);
    return NextResponse.json({ error: 'Failed to view report' }, { status: 500 });
  }
}
