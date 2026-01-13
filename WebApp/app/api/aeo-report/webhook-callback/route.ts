import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aeoReports, notifications } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { reportId, html } = await request.json();

    if (!reportId || !html) {
      return NextResponse.json({ error: 'reportId and html are required' }, { status: 400 });
    }

    // Update aeo_reports table with the generated HTML
    await db.update(aeoReports)
      .set({ html: html })
      .where(eq(aeoReports.id, reportId));

    // Update the corresponding notification status
    await db.update(notifications)
      .set({ status: 'sent', message: 'Your AEO report is ready!' })
      .where(eq(notifications.link, `/brand-monitor?tab=aeo&id=${reportId}`));

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Failed to process webhook callback for AEO report', e);
    return NextResponse.json({ error: 'Failed to process webhook callback' }, { status: 500 });
  }
}
