import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { syncUserProfileFromGoogle } from '@/lib/profile-sync';

/**
 * POST /api/auth/sync-profile
 * Sync user profile for current authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create profile data from current user session
    // The Google data is already mapped via mapProfileToUser in auth config
    const profileData = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      picture: session.user.image,
      email_verified: session.user.emailVerified,
    };

    // Sync profile data
    const result = await syncUserProfileFromGoogle(
      session.user.id,
      profileData as any,
      session.user
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to sync profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Profile sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}