import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fileGenerationJobs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { jobId } = params;
    const rows = await db.select().from(fileGenerationJobs).where(eq(fileGenerationJobs.id, jobId));
    const job = rows[0];
    if (!job) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    if (job.userId !== session.user.id) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      result: job.result || null,
      error: job.error || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
