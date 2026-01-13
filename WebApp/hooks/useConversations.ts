import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';
import type { Conversation, Message } from '@/lib/db/schema';

interface ConversationWithLastMessage extends Conversation {
  messages: Message[];
}

export function useConversations() {
  const { data: session } = useSession();
  
  return useQuery<ConversationWithLastMessage[]>({
    queryKey: ['conversations', session?.user?.id],
    queryFn: async () => {
      const res = await fetch('/api/chat');
      if (!res.ok) {
        throw new Error('Failed to fetch conversations');
      }
      return res.json();
    },
    enabled: !!session?.user?.id,
  });
}

export function useConversation(conversationId: string | null) {
  const { data: session } = useSession();
  
  return useQuery<Conversation & { messages: Message[] }>({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/chat?conversationId=${conversationId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch conversation');
      }
      return res.json();
    },
    enabled: !!session?.user?.id && !!conversationId,
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await fetch(`/api/chat/${conversationId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete conversation');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', session?.user?.id] });
    },
  });
}