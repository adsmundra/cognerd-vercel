import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { brandAnalyses } from '@/lib/db/schema';
import { executeWithRetry } from '@/lib/db/utils';

export async function POST(request: NextRequest) {
  try {
    // Get the session
    const sessionResponse = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionResponse?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('[TEST] User ID:', sessionResponse.user.id);

    // Create a test analysis
    const testAnalysisData = {
      userId: sessionResponse.user.id,
      url: 'https://test.com',
      companyName: 'Test Company',
      industry: 'Technology',
      analysisData: { test: 'data' },
      competitors: [{ name: 'Competitor 1' }],
      prompts: ['Test prompt'],
      creditsUsed: 1,
    };

    console.log('[TEST] Attempting to save:', testAnalysisData);

    const [savedAnalysis] = await executeWithRetry(async () => {
      return await db.insert(brandAnalyses).values(testAnalysisData).returning();
    });

    console.log('[TEST] Saved successfully:', savedAnalysis);

    return NextResponse.json({
      success: true,
      message: 'Test analysis saved successfully',
      analysis: savedAnalysis,
    });
  } catch (error) {
    console.error('[TEST] Error saving test analysis:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}