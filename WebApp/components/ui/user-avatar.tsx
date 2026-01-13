'use client';

import Image from 'next/image';
import { useUserProfile } from '@/hooks/useUserProfile';

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-3xl',
};

export function UserAvatar({ size = 'md', className = '', showName = false }: UserAvatarProps) {
  const { getDisplayName, getAvatarUrl, getInitials, loading } = useUserProfile();

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-200 rounded-full animate-pulse ${className}`} />
    );
  }

  const avatarUrl = getAvatarUrl();
  const displayName = getDisplayName();
  const initials = getInitials();

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0`}>
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName}
            width={size === 'xl' ? 96 : size === 'lg' ? 64 : size === 'md' ? 40 : 32}
            height={size === 'xl' ? 96 : size === 'lg' ? 64 : size === 'md' ? 40 : 32}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-blue-500 flex items-center justify-center text-white font-semibold ${sizeClasses[size]}`}>
            {initials}
          </div>
        )}
      </div>
      
      {showName && (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {displayName}
          </p>
        </div>
      )}
    </div>
  );
}