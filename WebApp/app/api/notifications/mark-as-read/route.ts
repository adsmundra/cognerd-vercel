import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

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
      ? and(eq(notifications.id, id), eq(notifications.userId, userId))
      : and(eq(notifications.id, id), eq(notifications.userEmail, userEmail!));

    await db.update(notifications)
      .set({ read: true })
      .where(where);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Failed to mark notification as read', e);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}
