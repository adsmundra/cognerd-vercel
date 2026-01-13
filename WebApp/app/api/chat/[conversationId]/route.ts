import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { conversations } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { handleApiError, AuthenticationError, NotFoundError } from '@/lib/api-errors';

// DELETE /api/chat/[conversationId] - Delete a conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      throw new AuthenticationError('Please log in to manage conversations');
    }

    const { conversationId } = params;

    // Verify the conversation belongs to the user
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, session.user.id)
      ),
    });

    if (!conversation) {
      throw new NotFoundError('Conversation');
    }

    // Delete the conversation (messages will cascade delete)
    await db
      .delete(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}