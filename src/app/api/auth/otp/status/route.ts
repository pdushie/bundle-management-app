import { NextRequest, NextResponse } from 'next/server';
import { OTPConfig } from '@/lib/otpConfig';

export async function GET(request: NextRequest) {
  try {
    const isEnabled = OTPConfig.isEnabled();
    
    return NextResponse.json({
      enabled: isEnabled,
      message: OTPConfig.getStatusMessage(),
      requiresEmailService: OTPConfig.requiresEmailService()
    });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { error: 'Failed to check OTP status' },
      { status: 500 }
    );
  }
}

