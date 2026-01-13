import { db } from '@/lib/db';
import { userProfile, userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface GoogleProfile {
  id: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email_verified?: boolean;
  locale?: string;
}

export interface BetterAuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
}

/**
 * Sync user profile data from Google OAuth to our user_profile table
 */
export async function syncUserProfileFromGoogle(
  userId: string, 
  googleProfile: GoogleProfile,
  betterAuthUser: BetterAuthUser
) {
  try {
    // Extract profile information
    const displayName = googleProfile.name || 
      `${googleProfile.given_name || ''} ${googleProfile.family_name || ''}`.trim() ||
      betterAuthUser.name ||
      googleProfile.email.split('@')[0];

    const avatarUrl = googleProfile.picture || betterAuthUser.image;

    // Check if profile already exists
    const existingProfile = await db.query.userProfile.findFirst({
      where: eq(userProfile.userId, userId),
    });

    if (existingProfile) {
      // Update existing profile with Google data (only if fields are empty)
      const updates: any = {
        updatedAt: new Date(),
      };

      if (!existingProfile.displayName && displayName) {
        updates.displayName = displayName;
      }
      if (!existingProfile.avatarUrl && avatarUrl) {
        updates.avatarUrl = avatarUrl;
      }

      if (Object.keys(updates).length > 1) { // More than just updatedAt
        await db
          .update(userProfile)
          .set(updates)
          .where(eq(userProfile.userId, userId));
      }
    } else {
      // Create new profile
      await db.insert(userProfile).values({
        userId,
        displayName,
        avatarUrl,
      });
    }

    // Ensure user settings exist
    const existingSettings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (!existingSettings) {
      await db.insert(userSettings).values({
        userId,
        theme: 'light',
        emailNotifications: true,
        marketingEmails: false,
        defaultModel: 'gpt-3.5-turbo',
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error syncing user profile from Google:', error);
    return { success: false, error };
  }
}

/**
 * Get complete user profile including Better Auth user data
 */
export async function getCompleteUserProfile(userId: string) {
  try {
    const profile = await db.query.userProfile.findFirst({
      where: eq(userProfile.userId, userId),
    });

    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    return {
      profile: profile || null,
      settings: settings || null,
    };
  } catch (error) {
    console.error('Error getting complete user profile:', error);
    return {
      profile: null,
      settings: null,
    };
  }
}

/**
 * Update user profile with new data
 */
export async function updateUserProfile(
  userId: string, 
  updates: Partial<{
    displayName: string;
    avatarUrl: string;
    bio: string;
    phone: string;
  }>
) {
  try {
    // Check if profile exists
    const existingProfile = await db.query.userProfile.findFirst({
      where: eq(userProfile.userId, userId),
    });

    if (!existingProfile) {
      // Create new profile
      const [newProfile] = await db
        .insert(userProfile)
        .values({
          userId,
          ...updates,
        })
        .returning();
      
      return { success: true, profile: newProfile };
    }

    // Update existing profile
    const [updatedProfile] = await db
      .update(userProfile)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(userProfile.userId, userId))
      .returning();

    return { success: true, profile: updatedProfile };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error };
  }
}