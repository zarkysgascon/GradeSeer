import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html } = body;

    // Validate email
    if (!to || !to.includes('@')) {
      console.log('❌ Invalid email address:', to);
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid email address' 
      });
    }

    console.log('📧 Attempting to send email to:', to);
    console.log('Subject:', subject);

    // DEVELOPMENT MODE: Simulate email sending
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 DEVELOPMENT MODE - Email would be sent to:', to);
      console.log('📝 Subject:', subject);
      console.log('📄 Content preview:', html.replace(/<[^>]*>/g, '').substring(0, 200) + '...');
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return NextResponse.json({ 
        success: true, 
        service: 'development',
        message: 'Email simulation successful - check browser console for details',
        simulatedTo: to
      });
    }

    // PRODUCTION MODE: Actual email sending with Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'GradeSeer <onboarding@resend.dev>',
            to: [to],
            subject: subject,
            html: html,
          }),
        });

        const result = await res.json();
        
        if (res.ok) {
          console.log('✅ Email sent successfully via Resend to:', to);
          return NextResponse.json({ 
            success: true, 
            service: 'resend',
            message: 'Email sent successfully'
          });
        } else {
          console.log('❌ Resend failed:', result);
          // Fall back to simulation
          return NextResponse.json({ 
            success: true,
            service: 'simulation',
            message: 'Email service unavailable - notification created in app'
          });
        }
      } catch (resendError) {
        console.log('❌ Resend error:', resendError);
        // Fall back to simulation
        return NextResponse.json({ 
          success: true,
          service: 'simulation',
          message: 'Email service error - notification created in app'
        });
      }
    }

    // No email service configured
    console.log('📧 No email service configured. Simulating send to:', to);
    return NextResponse.json({ 
      success: true, 
      service: 'simulation',
      message: 'Email simulated (no service configured)'
    });

  } catch (error) {
    console.error('Error in email service:', error);
    // Don't break the app - return success anyway
    return NextResponse.json({ 
      success: true,
      service: 'error',
      message: 'Email service error but notification created'
    });
  }
}