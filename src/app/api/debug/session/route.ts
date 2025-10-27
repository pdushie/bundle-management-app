import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getSecureServerSession } from '@/lib/session-security';
import { getCurrentTime } from '@/lib/timeService';

export async function GET(request: NextRequest) {
  try {
    // Console log removed for security
    
    // Get raw session
    const rawSession = await getServerSession(authOptions);
    // Console log removed for security
    
    // Get secure session
    const secureSession = await getSecureServerSession();
    // Console log removed for security
    
    return NextResponse.json({
      success: true,
      rawSession: rawSession ? {
        user: rawSession.user,
        expires: rawSession.expires,
        hasSignature: !!(rawSession as any).signature,
        signature: (rawSession as any).signature
      } : null,
      secureSession: secureSession ? {
        user: secureSession.user,
        expires: secureSession.expires,
        hasSignature: !!secureSession.signature
      } : null,
      debug: {
        time: (await getCurrentTime()).toISOString(),
        hasRawSession: !!rawSession,
        hasSecureSession: !!secureSession,
      }
    });
    
  } catch (error) {
    // // Console statement removed for security
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


