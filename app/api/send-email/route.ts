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

    // DEVELOPMENT MODE: Simulate email sending for all collaborators
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 [DEV MODE] Email simulation:');
      console.log('   To:', to);
      console.log('   Subject:', subject);
      console.log('   Content preview:', html.replace(/<[^>]*>/g, '').substring(0, 200) + '...');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return NextResponse.json({ 
        success: true, 
        service: 'development',
        message: 'Email simulation successful - check browser console for details',
        simulatedTo: to,
        simulatedSubject: subject
      });
    }

    // PRODUCTION MODE: Only send real emails in production
    const { data, error } = await resend.emails.send({
      from: 'GradeSeer <notifications@resend.dev>',
      to: [to],
      subject: subject,
      html: html,
      replyTo: 'noreply@resend.dev',
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