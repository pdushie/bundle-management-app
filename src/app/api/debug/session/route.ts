import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getSecureServerSession } from '@/lib/session-security';
import { getCurrentTime } from '@/lib/timeService';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Debug Session Route ===');
    
    // Get raw session
    const rawSession = await getServerSession(authOptions);
    console.log('Raw session:', JSON.stringify(rawSession, null, 2));
    
    // Get secure session
    const secureSession = await getSecureServerSession();
    console.log('Secure session:', JSON.stringify(secureSession, null, 2));
    
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
    // console.error('Debug session error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
