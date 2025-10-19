import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { sendVerificationEmail, generateVerificationToken, getVerificationTokenExpiry } from '@/lib/email';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Find user by email
      const result = await client.query(
        'SELECT id, email, name, email_verified, status FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const user = result.rows[0];

      // Check if already verified
      if (user.email_verified) {
        return NextResponse.json(
          { error: 'Email is already verified' },
          { status: 400 }
        );
      }

      // Generate new verification token
      const verificationToken = generateVerificationToken();
      const tokenExpiry = getVerificationTokenExpiry();

      // Update user with new token
      await client.query(
        `UPDATE users 
         SET verification_token = $1, 
             verification_token_expires = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [verificationToken, tokenExpiry, user.id]
      );

      // Create verification URL
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;

      // Send verification email
      const emailResult = await sendVerificationEmail({
        to: user.email,
        name: user.name,
        verificationUrl
      });

      if (!emailResult.success) {
        return NextResponse.json(
          { error: 'Failed to send verification email' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: 'Verification email sent successfully' },
        { status: 200 }
      );

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Resend verification email error:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
}