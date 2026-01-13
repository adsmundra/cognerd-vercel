import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getConfiguredProviders } from '@/lib/provider-config';
import { handleApiError, AuthenticationError } from '@/lib/api-errors';

export async function POST(request: NextRequest) {
  try {
    // Get the session
    const sessionResponse = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionResponse?.user) {
      throw new AuthenticationError('Please log in to use this feature');
    }

    const configuredProviders = getConfiguredProviders();
    const providers = configuredProviders.map(p => p.name);
    
    if (providers.length === 0) {
      return NextResponse.json({ 
        providers: [], 
        error: 'No AI providers configured. Please set at least one API key.' 
      });
    }
    
    return NextResponse.json({ providers });

  } catch (error) {
    return handleApiError(error);
  }
}