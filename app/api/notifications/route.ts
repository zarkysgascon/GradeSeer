import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.user_email, email))
      .orderBy(desc(notifications.created_at));

    return NextResponse.json(userNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, type, title, message, subjectId, subjectName, dueDate } = body;

    if (!userEmail || !type || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if similar notification already exists (within last 24 hours)
    const existingNotifications = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.user_email, userEmail),
          eq(notifications.type, type),
          eq(notifications.subject_id, subjectId || null),
          eq(notifications.title, title)
        )
      );

    if (existingNotifications.length > 0) {
      const recentNotification = existingNotifications.find(notif => {
        // Check if created_at exists and is not null
        if (!notif.created_at) return false;
        
        const notificationTime = notif.created_at.getTime();
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
        return notificationTime > twentyFourHoursAgo;
      });

      if (recentNotification) {
        return NextResponse.json({ message: 'Notification already exists' });
      }
    }

    const [newNotification] = await db
      .insert(notifications)
      .values({
        user_email: userEmail,
        type,
        title,
        message,
        subject_id: subjectId || null,
        subject_name: subjectName || null,
        due_date: dueDate ? new Date(dueDate) : null,
        read: false,
      })
      .returning();

    // Send email notification (non-blocking)
    sendEmailNotification(userEmail, title, message, subjectName, dueDate, type);

    return NextResponse.json(newNotification);
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// Non-blocking email function
async function sendEmailNotification(
  userEmail: string, 
  title: string, 
  message: string, 
  subjectName?: string, 
  dueDate?: string, 
  type?: string
) {
  try {
    const dueDateFormatted = dueDate ? new Date(dueDate).toLocaleDateString() : 'Not specified';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">GradeSeer</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Academic Performance Tracker</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="color: #666; line-height: 1.6; margin-bottom: 15px; font-size: 16px;">${message}</p>
            ${subjectName ? `<p style="color: #666; margin-bottom: 10px; font-size: 14px;"><strong>Subject:</strong> ${subjectName}</p>` : ''}
            <p style="color: #666; margin-bottom: 10px; font-size: 14px;"><strong>Due Date:</strong> ${dueDateFormatted}</p>
            ${type ? `<p style="color: #666; margin-bottom: 0; font-size: 14px;"><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}</p>` : ''}
          </div>
        </div>
        <div style="background: #f1f3f4; padding: 20px; text-align: center; color: #666; font-size: 12px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0;">This is an automated notification from GradeSeer.</p>
          <p style="margin: 8px 0 0 0;">You can manage your notifications in the app settings.</p>
        </div>
      </div>
    `;

    // Send email - in development this will simulate, in production it will send real emails
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: userEmail,
        subject: `GradeSeer: ${title}`,
        html: emailHtml,
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      if (result.service === 'development') {
        console.log('🎯 [DEV] Email simulation successful for:', userEmail);
      } else {
        console.log('✅ Email notification sent successfully to:', userEmail);
      }
    } else {
      console.log('❌ Failed to send email notification:', result.error);
    }

  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}