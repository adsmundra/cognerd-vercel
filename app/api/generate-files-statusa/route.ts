import { NextRequest, NextResponse } from 'next/server';
import { __notifyFilesAvailable } from '../generate-files-status/route';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { available, url, message } = body || {};

    if (typeof available !== 'boolean' || !url || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid payload. Expected { available: boolean, url: string, message: string }' },
        { status: 400 }
      );
    }

    // Normalize message check but still pass original to notifier
    const normalized = (message || '').toLowerCase().trim();

    // Notify the waiting endpoint
    __notifyFilesAvailable({ available, url, message: normalized === 'files are available' ? 'files are available' : message });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to process webhook' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, info: 'POST a JSON payload to notify file availability' });
}
