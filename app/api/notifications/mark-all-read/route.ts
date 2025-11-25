import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail } = body;

    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 400 });
    }

    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.user_email, userEmail));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
  }
}