import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';
import { API_ENDPOINTS, HTTP_METHODS, CONTENT_TYPES, ONE_MINUTE, CACHE_KEYS } from '@/config/constants';
import { parseApiResponse, ClientApiError } from '@/lib/client-errors';

interface SendMessageData {
  message: string;
  conversationId?: string;
}

interface MessageResponse {
  response: string;
  remainingCredits: number;
  creditsUsed: number;
  conversationId: string;
  messageId: string;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  
  return useMutation({
    mutationFn: async ({ message, conversationId }: SendMessageData) => {
      const res = await fetch(API_ENDPOINTS.CHAT, {
        method: HTTP_METHODS.POST,
        headers: {
          'Content-Type': CONTENT_TYPES.JSON,
        },
        body: JSON.stringify({ message, conversationId }),
      });
      
      return parseApiResponse<MessageResponse>(res);
    },
    onSuccess: (data) => {
      // Invalidate conversations list to update last message
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.CONVERSATIONS, session?.user?.id] });
      
      // Invalidate specific conversation to update messages
      if (data.conversationId) {
        queryClient.invalidateQueries({ queryKey: ['conversation', data.conversationId] });
      }
    },
  });
}

export function useMessageFeedback() {
  return useMutation({
    mutationFn: async ({ messageId, helpful }: { messageId: string; helpful: boolean }) => {
      const res = await fetch(API_ENDPOINTS.CHAT_FEEDBACK, {
        method: HTTP_METHODS.POST,
        headers: {
          'Content-Type': CONTENT_TYPES.JSON,
        },
        body: JSON.stringify({ messageId, helpful }),
      });
      
      return parseApiResponse(res);
    },
  });
}

export function useCredits() {
  const { data: session } = useSession();
  
  return useQuery<{ allowed: boolean; balance: number }>({
    queryKey: [CACHE_KEYS.CREDITS, session?.user?.id],
    queryFn: async () => {
      const res = await fetch(API_ENDPOINTS.CREDITS);
      return parseApiResponse<{ allowed: boolean; balance: number }>(res);
    },
    enabled: !!session?.user?.id,
    refetchInterval: ONE_MINUTE,
  });
}