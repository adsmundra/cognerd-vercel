import { db } from '@/lib/db';
import { brandprofile } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { scrapeCompanyInfo } from '@/lib/scrape-utils';

export async function GET(request: NextRequest) {
  try {
    // Get current user session
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all brands for the current user
    const brands = await db
      .select()
      .from(brandprofile)
      .where(eq(brandprofile.userId, session.user.id));

    return NextResponse.json({
      brands: brands || [],
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get current user session
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      console.log('No session found');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, url, industry, location, email } = body;

    console.log('Creating brand:', { name, url, industry, location, email, userId: session.user.id });

    // Validate required fields
    if (!name || !url || !industry || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: name, url, industry, location' },
        { status: 400 }
      );
    }

    // Create new brand
    const brandId = randomUUID();
    console.log('Inserting brand with ID:', brandId);

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Try to scrape brand data - this is non-blocking, if it fails the brand is still created
    let scrapedData = null;
    let logo = null;
    let favicon = null;
    let description = null;
    let isScraped = false;

    try {
      console.log('Attempting to scrape brand data from:', normalizedUrl);
      const company = await scrapeCompanyInfo(normalizedUrl);
      if (company) {
        scrapedData = company.scrapedData || null;
        logo = company.logo || null;
        favicon = company.favicon || null;
        description = company.description || null;
        isScraped = true;
        console.log('Brand scraped successfully:', { logo, favicon, isScraped });
      }
    } catch (scrapeError) {
      console.warn('Failed to scrape brand data:', scrapeError);
      // Continue with brand creation even if scraping fails
    }

    await db.insert(brandprofile).values({
      id: brandId,
      userId: session.user.id,
      name, // Maps to 'brand_name' column
      url: normalizedUrl,  // Maps to 'brandurl' column
      industry,
      location: location || 'Global',
      email: email || null,
      logo,
      favicon,
      description,
      scrapedData,
      isScraped,
    });

    console.log('Brand inserted successfully');

    // Fetch and return the created brand
    const newBrand = await db
      .select()
      .from(brandprofile)
      .where(eq(brandprofile.id, brandId));

    console.log('Brand fetched:', newBrand);

    if (!newBrand || newBrand.length === 0) {
      return NextResponse.json(
        { error: 'Brand created but could not be retrieved' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { brand: newBrand[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating brand:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create brand';
    return NextResponse.json(
      { error: `Failed to create brand: ${errorMessage}` },
      { status: 500 }
    );
  }
}
