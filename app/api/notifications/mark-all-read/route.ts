import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where = userId
      ? and(eq(notifications.userId, userId), eq(notifications.read, false))
      : and(eq(notifications.userEmail, userEmail!), eq(notifications.read, false));

    await db.update(notifications)
      .set({ read: true })
      .where(where);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Failed to mark all notifications as read', e);
    return NextResponse.json({ error: 'Failed to mark all notifications as read' }, { status: 500 });
  }
}
