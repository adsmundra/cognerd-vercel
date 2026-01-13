import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AuthenticationError, handleApiError } from './api-errors';
import { apiRateLimit } from './rate-limit';

interface ApiHandlerOptions {
  requireAuth?: boolean;
  rateLimit?: boolean;
}

export function withApiHandler(
  handler: (request: NextRequest, session?: any) => Promise<NextResponse>,
  options: ApiHandlerOptions = { requireAuth: true, rateLimit: true }
) {
  return async (request: NextRequest) => {
    try {
      if (options.rateLimit) {
        const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
        await apiRateLimit(request, clientIP);
      }

      let session = null;
      if (options.requireAuth) {
        const sessionResponse = await auth.api.getSession({
          headers: request.headers,
        });

        if (!sessionResponse?.user) {
          throw new AuthenticationError('Authentication required');
        }
        session = sessionResponse;
      }

      return await handler(request, session);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
