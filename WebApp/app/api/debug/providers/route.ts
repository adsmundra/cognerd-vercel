import { NextResponse } from 'next/server';
import { debugProviders } from '@/lib/debug-providers';

export async function GET() {
  try {
    const debug = debugProviders();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      providers: debug,
    });
  } catch (error) {
    console.error('Provider debug error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to debug providers',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}