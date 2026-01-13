import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { brandAnalyses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { handleApiError, AuthenticationError, NotFoundError } from '@/lib/api-errors';

// GET /api/brand-monitor/analyses/[analysisId] - Get a specific analysis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const sessionResponse = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionResponse?.user) {
      throw new AuthenticationError('Please log in to view this analysis');
    }

    const { analysisId } = await params;

    const analysis = await db.query.brandAnalyses.findFirst({
      where: and(
        eq(brandAnalyses.id, analysisId),
        eq(brandAnalyses.userId, sessionResponse.user.id)
      ),
    });

    if (!analysis) {
      throw new NotFoundError('Analysis not found');
    }

    return NextResponse.json(analysis);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/brand-monitor/analyses/[analysisId] - Delete an analysis
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const sessionResponse = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionResponse?.user) {
      throw new AuthenticationError('Please log in to delete this analysis');
    }

    const { analysisId } = await params;

    const result = await db.delete(brandAnalyses)
      .where(and(
        eq(brandAnalyses.id, analysisId),
        eq(brandAnalyses.userId, sessionResponse.user.id)
      ))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('Analysis not found');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}