import { NextRequest, NextResponse } from 'next/server';
import { OTPService } from '@/lib/otpService';
import { OTPConfig } from '@/lib/otpConfig';

export async function POST(request: NextRequest) {
  try {
    // Check if OTP is enabled
    if (!OTPConfig.isEnabled()) {
      return NextResponse.json(
        { error: 'OTP authentication is currently disabled.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    // Console log removed for security
    
    const { userId, otpCode } = body;

    if (!userId || !otpCode) {
      // Missing required fields - logging removed for security
      return NextResponse.json(
        { error: 'User ID and OTP code are required' },
        { status: 400 }
      );
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otpCode)) {
      // Invalid OTP format - logging removed for security
      return NextResponse.json(
        { error: 'Invalid OTP format. Please enter a 6-digit code.' },
        { status: 400 }
      );
    }

    // Verifying OTP for user - logging removed for security
    
    // Verify OTP
    const result = await OTPService.verifyOTP(userId, otpCode);
    // Console log removed for security

    if (!result.success) {
      const status = result.locked ? 429 : 400;
      return NextResponse.json(
        { 
          error: result.message,
          locked: result.locked,
          lockDuration: result.lockDuration
        },
        { status }
      );
    }

    // OTP verified successfully
    return NextResponse.json({
      success: true,
      message: result.message,
      userId: userId
    });

  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

