import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html } = body;

    // Validate email
    if (!to || !to.includes('@')) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid email address' 
      });
    }

    console.log('📧 Attempting to send email to:', to);

    // Send email using Resend - using a single verified domain
    const { data, error } = await resend.emails.send({
      from: 'GradeSeer <notifications@resend.dev>', // Single sender for everyone
      to: [to],
      subject: subject,
      html: html,
      replyTo: 'noreply@resend.dev', // Fixed: removed the duplicate string
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      });
    }

    console.log('✅ Email sent successfully to:', to);
    
    return NextResponse.json({ 
      success: true, 
      data: data,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('Error in email service:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to send email'
    });
  }
}