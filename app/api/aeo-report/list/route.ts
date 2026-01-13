import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aeoReports } from '@/lib/db/schema';
import { desc, eq, isNull } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // get session
    let userId: string | null = null;
    let userEmail: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: request.headers as any });
      if (session?.user) {
        userId = session.user.id || null;
        userEmail = session.user.email || null;
      }
    } catch {}

    // Only return reports for this user if logged in, otherwise empty list
    if (!userId && !userEmail) {
      return NextResponse.json({ reports: [] });
    }

    const where = userId
      ? eq(aeoReports.userId, userId)
      : eq(aeoReports.userEmail, userEmail!);

    const rows = await db
      .select({ id: aeoReports.id, customerName: aeoReports.customerName, url: aeoReports.url, createdAt: aeoReports.createdAt, read: aeoReports.read })
      .from(aeoReports)
      .where(where)
      .orderBy(desc(aeoReports.createdAt));

    return NextResponse.json({ reports: rows });
  } catch (e) {
    console.error('Failed to list AEO reports', e);
    return NextResponse.json({ error: 'Failed to list reports' }, { status: 500 });
  }
}
