import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory waiters for webhook notifications keyed by URL
const waiters = new Map<string, { resolve: (v: any) => void; timeout: NodeJS.Timeout }>();

async function waitForWebhook(url: string) {
  // If a webhook already came in and set a one-shot resolver, just await it
  const maxMs = 60 * 60 * 1000; // 60 minutes

  return await new Promise<{ available: boolean; url: string; message: string }>((resolve) => {
    // Set timeout fallback
    const timeout = setTimeout(() => {
      // Cleanup and resolve with timeout
      if (waiters.get(url)?.timeout) clearTimeout(waiters.get(url)!.timeout);
      waiters.delete(url);
      resolve({ available: false, url, message: 'timeout' });
    }, maxMs);

    // Register resolver for this URL
    // If multiple callers wait on same URL, latest takes over; extend as needed
    waiters.set(url, { resolve, timeout });
  });
}

// This endpoint is polled by the client until webhook arrives.
export async function GET(req: NextRequest) {
  return NextResponse.json({ error: 'Use POST with JSON body { url }' }, { status: 400 });
}

// Client calls this with the URL to wait for; we wait until webhook notifies or timeout
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 });

    const result = await waitForWebhook(url);
    if (result.available) return NextResponse.json(result);
    return NextResponse.json(result, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'failed' }, { status: 500 });
  }
}

// Export a helper to be used by the actual webhook route to notify availability
export function __notifyFilesAvailable(payload: { available: boolean; url: string; message: string }) {
  const { url, available, message } = payload || {} as any;
  const entry = waiters.get(url);
  if (entry && available === true && message === 'files are available') {
    clearTimeout(entry.timeout);
    entry.resolve({ available: true, url, message: 'files are available' });
    waiters.delete(url);
  }
}
