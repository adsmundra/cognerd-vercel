import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';
import type { UserProfile, UserSettings } from '@/lib/db/schema';

interface ProfileData {
  profile: UserProfile | null;
  settings: UserSettings | null;
  user: {
    id: string;
    email: string;
  };
}

export function useProfile() {
  const { data: session } = useSession();
  
  return useQuery<ProfileData>({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      const res = await fetch('/api/user/profile');
      if (!res.ok) {
        throw new Error('Failed to fetch profile');
      }
      return res.json();
    },
    enabled: !!session?.user?.id,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  
  return useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        throw new Error('Failed to update profile');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', session?.user?.id] });
    },
  });
}

export function useSettings() {
  const { data: session } = useSession();
  
  return useQuery<UserSettings>({
    queryKey: ['settings', session?.user?.id],
    queryFn: async () => {
      const res = await fetch('/api/user/settings');
      if (!res.ok) {
        throw new Error('Failed to fetch settings');
      }
      return res.json();
    },
    enabled: !!session?.user?.id,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  
  return useMutation({
    mutationFn: async (data: Partial<UserSettings>) => {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        throw new Error('Failed to update settings');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', session?.user?.id] });
    },
  });
}