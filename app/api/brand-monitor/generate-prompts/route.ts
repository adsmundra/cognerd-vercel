import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { Autumn } from 'autumn-js';
import { handleApiError, AuthenticationError, ValidationError } from '@/lib/api-errors';
import { generatePromptsForCompany } from '@/lib/ai-utils';
import { FEATURE_ID_MESSAGES } from '@/config/constants';

const autumn = new Autumn({
  apiKey: process.env.AUTUMN_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const sessionResponse = await auth.api.getSession({ headers: request.headers });
    if (!sessionResponse?.user) {
      throw new AuthenticationError('Please log in to use this feature');
    }

    const body = await request.json();
    const { company, competitors, personas } = body || {};

    if (!company || !company.name) {
      throw new ValidationError('Invalid request', { company: 'Company object with name is required' });
    }

    const competitorNames: string[] = Array.isArray(competitors)
      ? competitors.map((c: any) => (typeof c === 'string' ? c : c?.name)).filter(Boolean)
      : [];

    // Generate fresh prompts
    const prompts = await generatePromptsForCompany(company, competitorNames, personas);

    // Track 1 credit per prompt generated
    if (prompts && prompts.length > 0) {
      try {
        for (let i = 0; i < prompts.length; i++) {
          await autumn.track({
            customer_id: sessionResponse.user.id,
            feature_id: FEATURE_ID_MESSAGES,
            count: 1,
          });
        }
        console.log(`[Generate Prompts] Tracked ${prompts.length} credits for prompt generation`);
      } catch (err) {
        console.error('[Generate Prompts] Error tracking usage:', err);
        // Continue even if tracking fails - we don't want to block the user
      }
    }

    return NextResponse.json({ prompts });
  } catch (error) {
    return handleApiError(error);
  }
}
