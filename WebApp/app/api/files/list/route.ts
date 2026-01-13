import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fileGenerationJobs } from '@/lib/db/schema.files';
import { and, desc, eq, isNotNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const url = (searchParams.get('url') || '').trim();
    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    // Fetch latest completed/in_progress jobs with results for this user+url
    const jobs = await db.select().from(fileGenerationJobs)
      .where(and(eq(fileGenerationJobs.userId, session.user.id), eq(fileGenerationJobs.url, url)))
      .orderBy(desc(fileGenerationJobs.createdAt));

    // Aggregate files from the most recent job that has result data
    // Expecting result to hold an array of files or similar shape
    const files: any[] = [];
    for (const job of jobs) {
      if (job.result && Array.isArray((job.result as any).files)) {
        files.push(...(job.result as any).files);
        break;
      }
    }

    return NextResponse.json({ files });
  } catch (e: any) {
    console.error('[files/list] error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
