import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { Autumn } from 'autumn-js';
import { scrapeCompanyInfo } from '@/lib/scrape-utils';
import { FEATURE_ID_MESSAGES } from '@/config/constants';
import { generatePromptsForCompany } from '@/lib/ai-utils';
import {
  handleApiError,
  AuthenticationError,
  ValidationError,
  InsufficientCreditsError,
  ExternalServiceError
} from '@/lib/api-errors';
import { validateUrl } from '@/lib/brand-monitor-utils';
import { db } from '@/lib/db';
import { brandprofile } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const autumn = new Autumn({
  apiKey: process.env.AUTUMN_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    // Get the session
    const sessionResponse = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionResponse?.user) {
      throw new AuthenticationError('Please log in to use this feature');
    }

    // Check if user has enough credits (1 credit for URL scraping)
    try {
      const access = await autumn.check({
        customer_id: sessionResponse.user.id,
        feature_id: FEATURE_ID_MESSAGES,
      });
      
      // Optional: enforce credit requirement here
      // if (!access.data?.allowed || (access.data?.balance && access.data.balance < 1)) {
      //   throw new InsufficientCreditsError(
      //     'Insufficient credits. You need at least 1 credit to analyze a URL.',
      //     { required: 1, available: access.data?.balance || 0 }
      //   );
      // }
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        throw error;
      }
      console.error('[Brand Monitor Scrape] Credit check error:', error);
      throw new ExternalServiceError('Unable to verify credits. Please try again', 'autumn');
    }

    const { url, maxAge } = await request.json();

    if (!url) {
      throw new ValidationError('Invalid request', {
        url: 'URL is required'
      });
    }
    
    // Add robust URL validation here
    if (!await validateUrl(url)) {
      throw new ValidationError('Invalid or non-existent URL provided', {
        url: 'Please provide a valid and existing URL (e.g., example.com or https://example.com)'
      });
    }

    // Ensure URL has protocol
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Check if user has enough credits (1 credit for URL scraping) - MOVED HERE
    try {
      const access = await autumn.check({
        customer_id: sessionResponse.user.id,
        feature_id: FEATURE_ID_MESSAGES,
      });
      
      if (!access.data?.allowed || (access.data?.balance && access.data.balance < 1)) {
        throw new InsufficientCreditsError(
          'Insufficient credits. You need at least 1 credit to analyze a URL.',
          { required: 1, available: access.data?.balance || 0 }
        );
      }
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        throw error;
      }
      console.error('[Brand Monitor Scrape] Credit check error:', error);
      throw new ExternalServiceError('Unable to verify credits. Please try again', 'autumn');
    }

    // Track usage (1 credit for scraping) - MOVED HERE
    try {
      await autumn.track({
        customer_id: sessionResponse.user.id,
        feature_id: FEATURE_ID_MESSAGES,
        count: 1,
      });
    } catch (err) {
      console.error('[Brand Monitor Scrape] Error tracking usage:', err);
      // Continue even if tracking fails - we don't want to block the user
    }

    // 1) Check if brand already exists in database to avoid duplicate scraping
    let existingBrand = null;
    try {
      const brands = await db
        .select()
        .from(brandprofile)
        .where(
          and(
            eq(brandprofile.url, normalizedUrl),
            eq(brandprofile.userId, sessionResponse.user.id)
          )
        )
        .limit(1);

      if (brands.length > 0) {
        existingBrand = brands[0];
        console.log('[Brand Monitor Scrape] Found existing brand in database:', existingBrand.name);
      }
    } catch (dbError) {
      console.warn('[Brand Monitor Scrape] Error checking existing brand:', dbError);
      // Continue with scraping if database check fails
    }

    // 2) Scrape company info (only if not found in database, or if maxAge indicates refresh needed)
    let company;
    if (existingBrand && existingBrand.scrapedData && existingBrand.isScraped) {
      // Reuse existing brand data
      console.log('[Brand Monitor Scrape] Reusing existing brand data for:', existingBrand.name);
      company = {
        name: existingBrand.name,
        url: normalizedUrl,
        industry: existingBrand.industry,
        location: existingBrand.location,
        description: existingBrand.description,
        logo: existingBrand.logo,
        favicon: existingBrand.favicon,
        scrapedData: existingBrand.scrapedData,
      };
    } else {
      // Perform fresh scraping if brand doesn't exist or data is incomplete
      console.log('[Brand Monitor Scrape] Performing fresh scrape for:', normalizedUrl);
      company = await scrapeCompanyInfo(normalizedUrl, maxAge);
    }

    // 3) Determine competitors from scraped data (names array) if present
    const scrapedCompetitors: string[] = Array.isArray(company?.scrapedData?.competitors)
      ? company.scrapedData!.competitors!.filter(Boolean)
      : [];

    // 4) Generate FRESH prompts using scraped company data and competitors
    // This ensures new prompts are generated each time, even if reusing brand data
    let prompts: any[] = [];
    try {
      prompts = await generatePromptsForCompany(company, scrapedCompetitors);
      let len = prompts.length;
      for(let i = 0; i < len; i++){
        try {
          await autumn.track({
            customer_id: sessionResponse.user.id,
            feature_id: FEATURE_ID_MESSAGES,
            count: 1,
          });
        } catch (err) {
          console.error('[Brand Monitor Scrape] Error tracking usage:', err);
          // Continue even if tracking fails - we don't want to block the user
        }
      }
    } catch (e) {
      console.warn('[Brand Monitor Scrape] Failed to generate prompts from scrape; proceeding with empty prompts.', e);
      prompts = [];
    }

    // Return company and prompts together so UI can display prompts after Continue to Analysis
    return NextResponse.json({ company, prompts });
  } catch (error) {
    return handleApiError(error);
  }
}