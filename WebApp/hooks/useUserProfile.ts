'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';

interface UserProfile {
  id: string;
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark';
  emailNotifications: boolean;
  marketingEmails: boolean;
  defaultModel: string;
  metadata?: any;
}

interface UserProfileData {
  profile: UserProfile | null;
  settings: UserSettings | null;
  user: {
    id: string;
    email: string;
    name?: string;
    image?: string;
  };
}

export function useUserProfile() {
  const { data: session } = useSession();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/user/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      const data = await response.json();
      setProfileData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<{
    displayName: string;
    avatarUrl: string;
    bio: string;
    phone: string;
  }>) => {
    if (!session?.user) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedProfile = await response.json();
      
      // Refresh the profile data
      await fetchProfile();
      
      return updatedProfile;
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [session?.user?.id]);

  // Helper functions to get display values
  const getDisplayName = () => {
    if (profileData?.profile?.displayName) {
      return profileData.profile.displayName;
    }
    if (profileData?.user?.name) {
      return profileData.user.name;
    }
    if (profileData?.user?.email) {
      return profileData.user.email.split('@')[0];
    }
    return 'User';
  };

  const getAvatarUrl = () => {
    return profileData?.profile?.avatarUrl || profileData?.user?.image || null;
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return {
    profileData,
    loading,
    error,
    fetchProfile,
    updateProfile,
    // Helper functions
    getDisplayName,
    getAvatarUrl,
    getInitials,
    // Convenience accessors
    profile: profileData?.profile,
    settings: profileData?.settings,
    user: profileData?.user,
  };
}