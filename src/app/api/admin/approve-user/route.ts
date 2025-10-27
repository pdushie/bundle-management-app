import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';

const client = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // Console log removed for security

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' }, 
        { status: 400 }
      );
    }

    // Update user status to approved
    await client.query(`
      UPDATE users 
      SET status = 'approved'
      WHERE id = $1
    `, [userId]);

    // Log the approval (optional)
    // Admin approved user - logging removed for security

    return NextResponse.json(
      { message: 'User request approved successfully' },
      { status: 200 }
    );

  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}


