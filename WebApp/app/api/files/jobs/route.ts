import crypto from 'crypto';
import { Autumn } from 'autumn-js';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { CREDITS_PER_FILE_GENERATION, FEATURE_ID_MESSAGES } from '@/config/constants';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fileGenerationJobs } from '@/lib/db/schema';
import {
  AuthenticationError,
  ExternalServiceError,
  InsufficientCreditsError,
  ValidationError,
  handleApiError,
} from '@/lib/api-errors';

const N8N_WEBHOOK = 'https://n8n.welz.in/webhook/2f48da23-976e-4fd0-97da-2cb24c0b3e38';
const WEBHOOK_SECRET = process.env.FILES_WEBHOOK_SECRET || '';

const autumn = new Autumn({
  apiKey: process.env.AUTUMN_SECRET_KEY!,
});

function hmacSign(input: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(input).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      throw new AuthenticationError('Please log in to generate files');
    }

    const body = await req.json();
    const { url, brand = '', category = '', competitors = [], prompts = '' } = body || {};

    if (!url || typeof url !== 'string') {
      throw new ValidationError('Invalid url', { url: 'A valid URL is required' });
    }
    if (!brand || typeof brand !== 'string') {
      throw new ValidationError('Invalid brand', { brand: 'Brand name is required' });
    }
    if (!category || typeof category !== 'string') {
      throw new ValidationError('Invalid category', { category: 'Category is required' });
    }

    const userId = session.user.id;
    const userEmail = session.user.email || '';

    // Verify the customer has enough credits available
    let balance = 0;
    try {
      const access = await autumn.check({
        customer_id: userId,
        feature_id: FEATURE_ID_MESSAGES,
      });

      balance = access.data?.balance || 0;

      if (!access.data?.allowed || balance < CREDITS_PER_FILE_GENERATION) {
        throw new InsufficientCreditsError(
          `Insufficient credits. You need at least ${CREDITS_PER_FILE_GENERATION} credits to generate files.`,
          { required: CREDITS_PER_FILE_GENERATION, available: balance }
        );
      }
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        throw error;
      }

      throw new ExternalServiceError('Unable to verify credits. Please try again', 'autumn');
    }

    // Create job with nonce
    const nonce = crypto.randomBytes(16).toString('hex');
    const [job] = await db
      .insert(fileGenerationJobs)
      .values({
        userId,
        userEmail,
        url,
        brand,
        category,
        competitors,
        prompts,
        status: 'pending',
        nonce,
      })
      .returning();

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''}/api/files/callback`;
    const timestamp = Date.now();

    const stringToSign = `${job.id}:${userId}:${timestamp}:${nonce}`;
    const signature = WEBHOOK_SECRET ? hmacSign(stringToSign, WEBHOOK_SECRET) : '';

    const payload = {
      jobId: job.id,
      user: { id: userId, email: userEmail },
      data: { url, brand, category, competitors, prompts },
      callbackUrl,
      timestamp,
      nonce,
      signature,
    };

    // dev log for verification
    if (process.env.NODE_ENV !== 'production') {
      console.log('[files/jobs] webhook payload preview:', JSON.stringify(payload));
    }

    // fire-and-forget to n8n
    let responseCode = '';
    try {
      const res = await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      responseCode = `${res.status}`;

      if (!res.ok) {
        throw new ExternalServiceError(`Workflow responded with status ${res.status}`, 'n8n');
      }

      await db
        .update(fileGenerationJobs)
        .set({ webhookAttemptedAt: new Date(), webhookResponseCode: responseCode, status: 'in_progress' })
        .where(eq(fileGenerationJobs.id, job.id));
    } catch (error) {
      await db
        .update(fileGenerationJobs)
        .set({
          webhookAttemptedAt: new Date(),
          webhookResponseCode: responseCode || 'ERR',
          status: 'failed',
          error: 'Failed to trigger workflow',
        })
        .where(eq(fileGenerationJobs.id, job.id));

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError('Failed to trigger workflow', 'n8n');
    }

    // Deduct credits now that the workflow has been started
    let remainingCredits = balance;
    try {
      for(let i = 0; i < CREDITS_PER_FILE_GENERATION; i++){
        await autumn.track({
        customer_id: userId,
        feature_id: FEATURE_ID_MESSAGES,
        count: CREDITS_PER_FILE_GENERATION,
      });
      }
    } catch (error) {
      console.error('[files/jobs] Failed to deduct credits:', error);

      await db
        .update(fileGenerationJobs)
        .set({
          status: 'failed',
          error: 'Unable to deduct credits for file generation',
        })
        .where(eq(fileGenerationJobs.id, job.id));

      throw new ExternalServiceError('Unable to process credit deduction. Please try again', 'autumn');
    }

    try {
      const usage = await autumn.check({
        customer_id: userId,
        feature_id: FEATURE_ID_MESSAGES,
      });

      remainingCredits = usage.data?.balance ?? Math.max(0, balance - CREDITS_PER_FILE_GENERATION);
    } catch (error) {
      console.error('[files/jobs] Failed to fetch remaining credits:', error);
      remainingCredits = Math.max(0, balance - CREDITS_PER_FILE_GENERATION);
    }

    return NextResponse.json({ jobId: job.id, status: 'in_progress', remainingCredits });
  } catch (error) {
    console.error('[files/jobs] Error creating file generation job:', error);
    return handleApiError(error);
  }
}
