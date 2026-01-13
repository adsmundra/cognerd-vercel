import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { messageFeedback, messages } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

// POST /api/chat/feedback - Submit feedback for a message
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId, helpful, rating, feedback } = await request.json();

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    // Verify the message exists and belongs to the user
    const message = await db.query.messages.findFirst({
      where: and(
        eq(messages.id, messageId),
        eq(messages.userId, session.user.id)
      ),
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Create or update feedback
    const existingFeedback = await db.query.messageFeedback.findFirst({
      where: and(
        eq(messageFeedback.messageId, messageId),
        eq(messageFeedback.userId, session.user.id)
      ),
    });

    if (existingFeedback) {
      // Update existing feedback
      const [updated] = await db
        .update(messageFeedback)
        .set({
          rating: rating || (helpful === true ? 5 : helpful === false ? 1 : existingFeedback.rating),
          feedback: feedback || existingFeedback.feedback,
        })
        .where(eq(messageFeedback.id, existingFeedback.id))
        .returning();

      return NextResponse.json(updated);
    } else {
      // Create new feedback
      const [created] = await db
        .insert(messageFeedback)
        .values({
          messageId,
          userId: session.user.id,
          rating: rating || (helpful === true ? 5 : helpful === false ? 1 : null),
          feedback,
        })
        .returning();

      return NextResponse.json(created);
    }
  } catch (error: any) {
    console.error('Feedback POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}