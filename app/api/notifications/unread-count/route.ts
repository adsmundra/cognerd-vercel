import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json({ count: 0 });
    }

    const where = userId
      ? and(eq(notifications.userId, userId), eq(notifications.read, false))
      : and(eq(notifications.userEmail, userEmail!), eq(notifications.read, false));

    const unreadCount = await db
      .select({ count: count() })
      .from(notifications)
      .where(where);

    return NextResponse.json({ count: unreadCount[0]?.count || 0 });
  } catch (e) {
    console.error('Failed to get unread notification count', e);
    return NextResponse.json({ error: 'Failed to get unread notification count' }, { status: 500 });
  }
}
