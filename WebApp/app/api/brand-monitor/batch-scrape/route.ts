import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { handleApiError, AuthenticationError, ExternalServiceError } from '@/lib/api-errors';

export async function POST(request: NextRequest) {
  try {
    // Get the session
    const sessionResponse = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionResponse?.user) {
      throw new AuthenticationError('Please log in to use this feature');
    }

    // Forward the request to the original batch-scrape endpoint
    const body = await request.json();
    
    const geoBatchScrapeUrl = new URL('/geo/app/api/batch-scrape', request.url);
    const geoResponse = await fetch(geoBatchScrapeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Only forward safe headers, not authentication headers
        'User-Agent': request.headers.get('user-agent') || '',
        'Accept': request.headers.get('accept') || '*/*',
        'Accept-Language': request.headers.get('accept-language') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await geoResponse.json();
    return NextResponse.json(data, { status: geoResponse.status });

  } catch (error) {
    return handleApiError(error);
  }
}