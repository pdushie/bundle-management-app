import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationEmail, generateVerificationToken } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Generate a test verification token
    const verificationToken = generateVerificationToken();
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;

    // Send verification email
    const result = await sendVerificationEmail({
      to: email,
      name: name,
      verificationUrl
    });

    if (result.success) {
      return NextResponse.json({
        message: 'Test verification email sent successfully!',
        data: result.data
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}

