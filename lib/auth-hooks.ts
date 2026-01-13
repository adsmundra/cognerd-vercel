import { auth } from './auth';
import { syncUserProfileFromGoogle } from './profile-sync';

/**
 * Handle post-OAuth profile syncing
 * This function should be called after successful Google OAuth login
 */
export async function handleGoogleOAuthSuccess(userId: string) {
  try {
    // Get the user's session to access account information
    const session = await auth.api.getSession({
      headers: new Headers(),
    });

    if (!session?.user) {
      console.log('No session found for profile sync');
      return;
    }

    // For now, we'll sync basic profile info from the Better Auth user data
    // The Google profile data is already mapped via mapProfileToUser
    const googleProfileData = {
      id: userId,
      email: session.user.email,
      name: session.user.name,
      picture: session.user.image,
      email_verified: session.user.emailVerified,
    };

    await syncUserProfileFromGoogle(
      userId,
      googleProfileData as any,
      session.user
    );

    console.log('Profile synced successfully for user:', userId);
  } catch (error) {
    console.error('Failed to sync profile after OAuth:', error);
    // Don't throw error to avoid breaking the login flow
  }
}

/**
 * Sync profile for existing user session
 */
export async function syncCurrentUserProfile() {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(),
    });

    if (session?.user) {
      await handleGoogleOAuthSuccess(session.user.id);
    }
  } catch (error) {
    console.error('Failed to sync current user profile:', error);
  }
}