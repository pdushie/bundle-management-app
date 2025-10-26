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

    console.log('Debug API - Session:', JSON.stringify(session, null, 2));

    const userEmail = session.user.email;
    const userId = (session.user as any).id;
    const userRole = session.user.role;

    console.log('Debug API - User details:', { userEmail, userId, userRole });

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
      console.log('Debug API - User from DB:', userResult.rows[0]);

      // Check user's RBAC roles
      const rolesResult = await pool.query(`
        SELECT r.name as role_name, r.display_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1 AND ur.is_active = true AND r.is_active = true
      `, [userId]);
      console.log('Debug API - User roles:', rolesResult.rows);

      // Check user's permissions through roles
      const permissionsResult = await pool.query(`
        SELECT DISTINCT p.name as permission_name, p.description
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = $1 AND ur.is_active = true AND p.is_active = true
        ORDER BY p.name
      `, [userId]);
      console.log('Debug API - User permissions:', permissionsResult.rows);

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
    console.error('Debug API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}