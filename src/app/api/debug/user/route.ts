import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if database is available
    if (!db) {
      console.error('Database connection is not available');
      return NextResponse.json({ 
        error: 'Database connection unavailable'
      }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const email = session.user.email;
    if (!email) {
      return NextResponse.json({ error: 'No email found in session' }, { status: 400 });
    }
    
    // Get user from database directly to see what role is stored there
    const dbUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    return NextResponse.json({
      session: {
        user: {
          ...session.user,
        }
      },
      databaseUser: dbUser.length > 0 ? dbUser[0] : null,
      roleComparison: {
        sessionRole: session.user.role,
        dbRole: dbUser.length > 0 ? dbUser[0].role : null,
        matches: dbUser.length > 0 ? session.user.role === dbUser[0].role : false,
        lowerCaseMatches: dbUser.length > 0 ? 
          session.user.role?.toLowerCase() === dbUser[0].role?.toLowerCase() : false
      }
    });
  } catch (error) {
    console.error('Error in user debugging API:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
