import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications, aeoReports } from '@/lib/db/schema';
import { desc, eq, and } from 'drizzle-orm';
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
      return NextResponse.json({ notifications: [] });
    }

    const where = userId
      ? eq(notifications.userId, userId)
      : eq(notifications.userEmail, userEmail!);

    const rows = await db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt));

    const notificationsToProcess = [...rows]; // Create a mutable copy

    // Process notifications to potentially create new 'aeo_report_ready' entries
    await Promise.all(notificationsToProcess.map(async (notification, index) => {
      if (notification.type === 'aeo_report_generated' && notification.assetId && notification.assetTable === 'aeo_reports') {
        const aeoReport = await db.select().from(aeoReports).where(eq(aeoReports.id, notification.assetId)).limit(1);

        if (aeoReport.length > 0 && (aeoReport[0].html && aeoReport[0].html.trim() !== '')) {
          // HTML is populated, check if a 'report ready' notification already exists
          const existingReadyNotification = await db.select()
            .from(notifications)
            .where(
              and(
                eq(notifications.assetId, notification.assetId),
                eq(notifications.assetTable, 'aeo_reports'),
                eq(notifications.type, 'aeo_report_ready')
              )
            )
            .limit(1);

          if (existingReadyNotification.length === 0) {
            // No 'report ready' notification exists, create one
            const newReadyNotification = {
              userId: notification.userId,
              userEmail: notification.userEmail,
              type: 'aeo_report_ready',
              message: `Your AEO report for ${aeoReport[0].customerName} is ready, please click the link below to see and download`,
              link: `/api/aeo-reports/${notification.assetId}/view`,
              assetId: notification.assetId,
              assetTable: 'aeo_reports',
              status: 'sent',
              read: false,
              createdAt: new Date(),
              renderAsButton: true,
            };
            await db.insert(notifications).values(newReadyNotification);
            // Mark the original 'aeo_report_generated' notification as read
            await db.update(notifications)
              .set({ read: true })
              .where(eq(notifications.id, notification.id));
          }
        }
      }
    }));

    // Re-fetch all notifications for the user from the database without any filters
    const finalNotifications = await db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt));

    return NextResponse.json({ notifications: finalNotifications });
  } catch (e) {
    console.error('Failed to list notifications', e);
    return NextResponse.json({ error: 'Failed to list notifications' }, { status: 500 });
  }
}
