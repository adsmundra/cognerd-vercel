import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { fileGenerationJobs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      let pollTimer: NodeJS.Timeout | null = null;
      let keepAliveTimer: NodeJS.Timeout | null = null;
      let isClosed = false;

      function safeSend(data: any) {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          safeClose();
        }
      }

      function safeEnqueueKeepAlive() {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`:\n\n`));
        } catch {
          safeClose();
        }
      }

      function safeClose() {
        if (isClosed) return;
        isClosed = true;
        if (pollTimer) clearInterval(pollTimer);
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        try { controller.close(); } catch {}
      }

      // Initial send
      try {
        const rows = await db.select().from(fileGenerationJobs).where(eq(fileGenerationJobs.id, jobId));
        const job = rows[0];
        if (!job) {
          safeSend({ error: 'NOT_FOUND' });
          safeClose();
          return;
        }
        safeSend({ status: job.status, result: job.result, error: job.error });
      } catch (e) {
        safeSend({ error: 'Internal error' });
        safeClose();
        return;
      }

      // Poll DB periodically server-side and push updates
      let lastStatus: string | null = null;
      pollTimer = setInterval(async () => {
        if (isClosed) return;
        try {
          const rows = await db.select().from(fileGenerationJobs).where(eq(fileGenerationJobs.id, jobId));
          const job = rows[0];
          if (!job) {
            safeSend({ error: 'NOT_FOUND' });
            safeClose();
            return;
          }
          if (job.status !== lastStatus) {
            lastStatus = job.status;
            safeSend({ status: job.status, result: job.result, error: job.error });
            if (job.status === 'completed' || job.status === 'failed') {
              safeClose();
            }
          }
        } catch {
          // ignore transient errors
        }
      }, 3000);

      // Keep-alive
      keepAliveTimer = setInterval(() => {
        safeEnqueueKeepAlive();
      }, 15000);

      // Close on client abort
      const signal = req.signal as AbortSignal;
      signal?.addEventListener?.('abort', () => {
        safeClose();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
