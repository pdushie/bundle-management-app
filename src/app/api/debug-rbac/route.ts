import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Console log removed for security

    const userEmail = session.user.email;
    const userId = (session.user as any).id;
    const userRole = session.user.role;

    // Console log removed for security

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID not found in session',
        session: session,
        userEmail,
        userRole
      }, { status: 400 });
    }

    // Try to get user permissions from database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      // First check if user exists in database
      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      // Console log removed for security

      // Check user's RBAC roles
      const rolesResult = await pool.query(`
        SELECT r.name as role_name, r.display_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1 AND ur.is_active = true AND r.is_active = true
      `, [userId]);
      // Console log removed for security

      // Check user's permissions through roles
      const permissionsResult = await pool.query(`
        SELECT DISTINCT p.name as permission_name, p.description
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = $1 AND ur.is_active = true AND p.is_active = true
        ORDER BY p.name
      `, [userId]);
      // Console log removed for security

      return NextResponse.json({
        success: true,
        session: session,
        userFromDB: userResult.rows[0],
        roles: rolesResult.rows,
        permissions: permissionsResult.rows,
        debug: {
          userEmail,
          userId,
          userRole,
          sessionHasId: !!userId
        }
      });

    } finally {
      await pool.end();
    }

  } catch (error) {
    // Console statement removed for security
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

