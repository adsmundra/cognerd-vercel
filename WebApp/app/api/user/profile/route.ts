import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userProfile, userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { handleApiError, AuthenticationError, ValidationError } from '@/lib/api-errors';

// GET /api/user/profile - Get user profile and settings
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      throw new AuthenticationError('Please log in to access your profile');
    }

    // Get user profile with settings
    const profile = await db.query.userProfile.findFirst({
      where: eq(userProfile.userId, session.user.id),
    });

    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.user.id),
    });

    return NextResponse.json({
      profile: profile || null,
      settings: settings || null,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/user/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      throw new AuthenticationError('Please log in to access your profile');
    }

    const data = await request.json();
    const { displayName, avatarUrl, bio, phone } = data;

    // Upsert user profile
    const [updatedProfile] = await db
      .insert(userProfile)
      .values({
        userId: session.user.id,
        displayName,
        avatarUrl,
        bio,
        phone,
      })
      .onConflictDoUpdate({
        target: userProfile.userId,
        set: {
          displayName,
          avatarUrl,
          bio,
          phone,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json(updatedProfile);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/user/profile - Partial update
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      throw new AuthenticationError('Please log in to access your profile');
    }

    const updates = await request.json();
    
    // Remove any fields that shouldn't be updated
    delete updates.id;
    delete updates.userId;
    delete updates.createdAt;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Check if profile exists
    const existingProfile = await db.query.userProfile.findFirst({
      where: eq(userProfile.userId, session.user.id),
    });

    if (!existingProfile) {
      // Create new profile with partial data
      const [newProfile] = await db
        .insert(userProfile)
        .values({
          userId: session.user.id,
          ...updates,
        })
        .returning();
      
      return NextResponse.json(newProfile);
    }

    // Update existing profile
    const [updatedProfile] = await db
      .update(userProfile)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(userProfile.userId, session.user.id))
      .returning();

    return NextResponse.json(updatedProfile);
  } catch (error) {
    return handleApiError(error);
  }
}