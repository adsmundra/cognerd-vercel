import { db } from '@/lib/db';
import { 
  brandprofile, 
  brandAnalyses, 
  aeoReports,
  files,
  fileGenerationJobs,
  blogs,
  topicSuggestions
} from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;

    // Fetch brand profile
    const brand = await db
      .select()
      .from(brandprofile)
      .where(eq(brandprofile.id, brandId))
      .limit(1);

    if (!brand || brand.length === 0) {
      return NextResponse.json(
        { error: 'Brand profile not found' },
        { status: 404 }
      );
    }

    // Fetch brand analyses
    const analyses = await db
      .select()
      .from(brandAnalyses)
      .where(eq(brandAnalyses.url, brand[0].url))
      .orderBy(brandAnalyses.createdAt);

    return NextResponse.json({
      brand: brand[0],
      analyses: analyses || [],
    });
  } catch (error) {
    console.error('Error fetching brand:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand profile' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;

    // Get current user session
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, url, industry, location, email, description } = body;

    // Validate required fields
    if (!name || !url || !industry || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: name, url, industry, location' },
        { status: 400 }
      );
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Update the brand profile
    await db
      .update(brandprofile)
      .set({
        name,
        url: normalizedUrl,
        industry,
        location: location || 'Global',
        email: email || null,
        description: description || null,
        updatedAt: new Date(),
      })
      .where(eq(brandprofile.id, brandId));

    // Fetch and return the updated brand
    const updatedBrand = await db
      .select()
      .from(brandprofile)
      .where(eq(brandprofile.id, brandId))
      .limit(1);

    if (!updatedBrand || updatedBrand.length === 0) {
      return NextResponse.json(
        { error: 'Brand profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ brand: updatedBrand[0] });
  } catch (error) {
    console.error('Error updating brand:', error);
    return NextResponse.json(
      { error: 'Failed to update brand profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;

    // Get current user session
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // 1. Fetch the brand first to confirm ownership and get details
    const [brand] = await db
      .select()
      .from(brandprofile)
      .where(and(eq(brandprofile.id, brandId), eq(brandprofile.userId, userId)))
      .limit(1);

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand profile not found' },
        { status: 404 }
      );
    }

    const brandUrl = brand.url;
    const brandName = brand.name;

    // 2. Delete related data in parallel promises where possible
    // Using simple deletes for now. Ideally, this should be a transaction.
    
    // Brand Analyses
    const deleteAnalyses = db.delete(brandAnalyses)
      .where(
        and(
          eq(brandAnalyses.userId, userId),
          or(
            eq(brandAnalyses.url, brandUrl),
            eq(brandAnalyses.companyName, brandName)
          )
        )
      );

    // AEO Reports
    const deleteAeoReports = db.delete(aeoReports)
      .where(
        and(
          eq(aeoReports.userId, userId),
          or(
            eq(aeoReports.url, brandUrl),
            eq(aeoReports.customerName, brandName)
          )
        )
      );

    // Files (Geo Files)
    const deleteFiles = db.delete(files)
      .where(
        and(
          eq(files.userId, userId),
          or(
            eq(files.url, brandUrl),
            eq(files.brand, brandName)
          )
        )
      );

    // File Generation Jobs
    const deleteFileJobs = db.delete(fileGenerationJobs)
      .where(
        and(
          eq(fileGenerationJobs.userId, userId),
          or(
            eq(fileGenerationJobs.url, brandUrl),
            eq(fileGenerationJobs.brand, brandName)
          )
        )
      );

    // Prepare promises array
    const deletePromises = [
        deleteAnalyses,
        deleteAeoReports,
        deleteFiles,
        deleteFileJobs
    ];

    // User-email based deletions (Blogs, Topics)
    if (userEmail) {
        // Blogs
        deletePromises.push(
            db.delete(blogs)
            .where(
                and(
                    eq(blogs.emailId, userEmail),
                    or(
                        eq(blogs.companyUrl, brandUrl),
                        eq(blogs.brandName, brandName)
                    )
                )
            )
        );

        // Topic Suggestions
        deletePromises.push(
            db.delete(topicSuggestions)
            .where(
                and(
                    eq(topicSuggestions.emailId, userEmail),
                    eq(topicSuggestions.brandName, brandName)
                )
            )
        );
    }

    // Execute all related deletions
    await Promise.all(deletePromises);

    // 3. Finally, delete the brand profile itself
    const result = await db
      .delete(brandprofile)
      .where(eq(brandprofile.id, brandId));

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to delete brand profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json(
      { error: 'Failed to delete brand profile' },
      { status: 500 }
    );
  }
}
