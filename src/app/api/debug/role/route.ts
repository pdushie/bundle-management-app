import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    return NextResponse.json({
      authenticated: !!session,
      user: session?.user ? {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        roleType: typeof session.user.role,
        roleLowercase: session.user.role?.toLowerCase(),
        isSuperAdmin: session.user.role?.toLowerCase() === 'superadmin',
      } : null,
      session: session
    });
  } catch (error) {
    console.error('Error in role debug API:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
