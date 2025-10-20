import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { OTPService } from '@/lib/otpService';
import { sendOTPEmail } from '@/lib/email';
import { OTPConfig } from '@/lib/otpConfig';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function POST(request: NextRequest) {
  try {
    // Check if OTP is enabled
    if (!OTPConfig.isEnabled()) {
      return NextResponse.json(
        { error: 'OTP authentication is currently disabled. Please use regular sign-in.' },
        { status: 400 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // First verify the user credentials
      const result = await client.query(
        'SELECT id, name, email, hashed_password, email_verified, status, is_active FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      const user = result.rows[0];

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.hashed_password);
      if (!passwordMatch) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Check email verification
      if (!user.email_verified) {
        return NextResponse.json(
          { error: 'Please verify your email address before signing in' },
          { status: 403 }
        );
      }

      // Check account status
      if (user.status !== 'approved') {
        const statusMessage = user.status === 'pending' 
          ? 'Your account is pending approval'
          : user.status === 'rejected'
          ? 'Your account was rejected. Please contact support.'
          : 'Account access denied';
        
        return NextResponse.json(
          { error: statusMessage },
          { status: 403 }
        );
      }

      // Check if account is active
      if (user.is_active === false) {
        return NextResponse.json(
          { error: 'Your account has been disabled. Please contact support' },
          { status: 403 }
        );
      }

      // Check if user is currently locked due to OTP attempts
      const otpStatus = await OTPService.getOTPStatus(user.id);
      if (otpStatus.isLocked) {
        return NextResponse.json(
          { 
            error: `Account temporarily locked due to too many failed OTP attempts. Try again in ${otpStatus.lockDuration} minutes.`,
            locked: true,
            lockDuration: otpStatus.lockDuration
          },
          { status: 429 }
        );
      }

      // Generate OTP
      console.log('User ID type and value:', typeof user.id, user.id);
      const otpResult = await OTPService.generateOTPForUser(user.id);
      console.log('OTP generation result:', otpResult);
      if (!otpResult.success) {
        return NextResponse.json(
          { error: otpResult.message },
          { status: 500 }
        );
      }

      // Get the generated OTP to send via email
      const otpQuery = await client.query(
        'SELECT otp_secret FROM users WHERE id = $1',
        [user.id]
      );

      if (otpQuery.rows.length === 0 || !otpQuery.rows[0].otp_secret) {
        return NextResponse.json(
          { error: 'Failed to generate OTP' },
          { status: 500 }
        );
      }

      const otpCode = otpQuery.rows[0].otp_secret;

      // Send OTP email
      const emailResult = await sendOTPEmail({
        to: user.email,
        name: user.name,
        otpCode: otpCode,
        expiryMinutes: 10
      });

      if (!emailResult.success) {
        console.error('Failed to send OTP email:', emailResult.error);
        // Clear the OTP if email failed
        await OTPService.clearOTP(user.id);
        return NextResponse.json(
          { error: 'Failed to send OTP email. Please try again.' },
          { status: 500 }
        );
      }

      console.log('OTP request successful for user:', user.id);
      
      return NextResponse.json({
        success: true,
        message: 'OTP sent to your email address',
        userId: user.id, // We'll need this for OTP verification
        expiresIn: 10 // minutes
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('OTP request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}