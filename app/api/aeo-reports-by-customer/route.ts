import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aeoReports } from '@/lib/db/schema';
import { eq, and, desc, or, ilike } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerName = searchParams.get('customerName')?.trim();

    if (!customerName) {
      return NextResponse.json(
        { error: 'customerName is required' },
        { status: 400 }
      );
    }

    console.log('[AEO Reports] Fetching reports for customer:', customerName);

    // Get session via Better Auth
    let userId: string | null = null;
    let userEmail: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: request.headers as any });
      if (session?.user) {
        userId = session.user.id || null;
        userEmail = session.user.email || null;
      }
    } catch (e) {
      console.error('[AEO Reports] Session error:', e);
    }

    if (!userId && !userEmail) {
      console.log('[AEO Reports] No user ID or email found, returning 401');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('[AEO Reports] User ID:', userId, 'Email:', userEmail, 'Customer Name:', customerName);

    // Build auth condition: match by userId OR userEmail
    const authCondition = or(
      userId ? eq(aeoReports.userId, userId) : undefined,
      userEmail ? eq(aeoReports.userEmail, userEmail) : undefined
    );

    // Fetch AEO reports for this customer name and user
    // Using ilike for case-insensitive matching of customer name
    const reports = await db
      .select()
      .from(aeoReports)
      .where(
        and(
          authCondition,
          ilike(aeoReports.customerName, customerName)
        )
      )
      .orderBy(desc(aeoReports.createdAt)); // Most recent first

    // Filter to only include completed reports (those with html content)
    const completedReports = reports.filter(report => report.html !== null);

    const response = NextResponse.json({
      success: true,
      reports: completedReports.map(report => ({
        id: report.id,
        customerName: report.customerName,
        url: report.url,
        createdAt: report.createdAt || new Date().toISOString(),
      })),
      debug: {
        totalReports: reports.length,
        completedReports: completedReports.length,
      },
    });

    // Add no-cache headers to ensure fresh data
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Failed to fetch AEO reports by customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AEO reports' },
      { status: 500 }
    );
  }
}
