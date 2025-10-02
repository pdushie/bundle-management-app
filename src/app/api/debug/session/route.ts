import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCurrentTime } from '@/lib/timeService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Log session details on the server
    console.log('Debug Session:', JSON.stringify(session, null, 2));
    
    return NextResponse.json({ 
      user: session?.user || null,
      status: session ? 'authenticated' : 'unauthenticated',
      debug: {
        time: (await getCurrentTime()).toISOString(),
        hasSession: !!session,
      }
    });
  } catch (error) {
    console.error('Error in debug session:', error);
    return NextResponse.json(
      { error: 'Failed to get session debug info' },
      { status: 500 }
    );
  }
}
