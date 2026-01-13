'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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



interface UserProfileData {
  profile: UserProfile | null;

  user: {
    id: string;
    email: string;
    name?: string;
    image?: string;
  };
}

export function UserProfileCard() {
  const { data: session } = useSession();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
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

  if (!session?.user) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading profile: {error}</p>
      </div>
    );
  }

  const user = session.user;
  const profile = profileData?.profile;
  const displayName = profile?.displayName || user.name || user.email?.split('@')[0];
  const avatarUrl = profile?.avatarUrl || user.image;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-4">
        <div className="relative">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName || 'User'}
              width={64}
              height={64}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-semibold">
                {displayName?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {displayName}
          </h3>
          <p className="text-gray-600">{user.email}</p>
          {profile?.bio && (
            <p className="text-sm text-gray-500 mt-1">{profile.bio}</p>
          )}
        </div>
      </div>

      {profile && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {profile.phone && (
              <div>
                <span className="font-medium text-gray-700">Phone:</span>
                <span className="ml-2 text-gray-600">{profile.phone}</span>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700">Member since:</span>
              <span className="ml-2 text-gray-600">
                {new Date(profile.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}