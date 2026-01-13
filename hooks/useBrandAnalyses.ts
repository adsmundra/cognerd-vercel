import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';
import type { BrandAnalysis } from '@/lib/db/schema';

export function useBrandAnalyses() {
  const { data: session } = useSession();
  
  return useQuery<BrandAnalysis[]>({
    queryKey: ['brandAnalyses', session?.user?.id],
    queryFn: async () => {
      const res = await fetch('/api/brand-monitor/analyses');
      if (!res.ok) {
        throw new Error('Failed to fetch brand analyses');
      }
      return res.json();
    },
    enabled: !!session?.user?.id,
  });
}

export function useBrandAnalysis(analysisId: string | null) {
  const { data: session } = useSession();
  
  return useQuery<BrandAnalysis>({
    queryKey: ['brandAnalysis', analysisId],
    queryFn: async () => {
      const res = await fetch(`/api/brand-monitor/analyses/${analysisId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch brand analysis');
      }
      return res.json();
    },
    enabled: !!session?.user?.id && !!analysisId,
  });
}

export function useSaveBrandAnalysis() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  
  return useMutation({
    mutationFn: async (analysisData: Partial<BrandAnalysis>) => {
      console.log('[HOOK] Saving analysis data:', analysisData);
      
      const res = await fetch('/api/brand-monitor/analyses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisData),
      });
      
      console.log('[HOOK] Save response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[HOOK] Save failed:', errorData);
        throw new Error(`Failed to save brand analysis: ${errorData.error || res.statusText}`);
      }
      
      const result = await res.json();
      console.log('[HOOK] Save successful:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('[HOOK] Save mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['brandAnalyses', session?.user?.id] });
    },
    onError: (error) => {
      console.error('[HOOK] Save mutation error:', error);
    },
  });
}

export function useDeleteBrandAnalysis() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  
  return useMutation({
    mutationFn: async (analysisId: string) => {
      const res = await fetch(`/api/brand-monitor/analyses/${analysisId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete brand analysis');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandAnalyses', session?.user?.id] });
    },
  });
}