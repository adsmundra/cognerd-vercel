import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { handleApiError, AuthenticationError, ValidationError } from '@/lib/api-errors';
import { generatePersonasForBrand } from '@/lib/ai-utils';

export async function POST(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers });
    if (!sessionResponse?.user) {
      throw new AuthenticationError('Please log in to use this feature');
    }

    const body = await request.json();
    const { company } = body || {};

    if (!company || !company.name) {
      throw new ValidationError('Invalid request', { company: 'Company object with name is required' });
    }

    // Generate personas
    const personas = await generatePersonasForBrand(company);

    return NextResponse.json({ personas });
  } catch (error) {
    return handleApiError(error);
  }
}
