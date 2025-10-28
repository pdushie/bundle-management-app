// API endpoint for user assignments to account managers
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session-security';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function GET(request: NextRequest) {
  try {
    // Use secure session validation with role checking
    const session = await requireAdmin();
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unauthorized access" 
    }, { status: 401 });
  }

  const client = await pool.connect();

  try {
    // Get all users with their assigned account managers
    const usersQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.account_manager_id,
        am.name as account_manager_name,
        am.email as account_manager_email,
        u.created_at
      FROM users u
      LEFT JOIN users am ON u.account_manager_id = am.id
      WHERE u.role NOT IN ('super_admin', 'superadmin')
      ORDER BY u.name
    `;

    // Get all potential account managers (admins)
    const accountManagersQuery = `
      SELECT id, name, email, role
      FROM users
      WHERE role IN ('admin', 'standard_admin', 'super_admin', 'superadmin')
      AND status = 'approved'
      ORDER BY name
    `;

    const [usersResult, accountManagersResult] = await Promise.all([
      client.query(usersQuery),
      client.query(accountManagersQuery)
    ]);

    return NextResponse.json({
      success: true,
      users: usersResult.rows,
      accountManagers: accountManagersResult.rows
    });

  } catch (error) {
    console.error('Error fetching user assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use secure session validation with role checking
    const session = await requireAdmin();
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unauthorized access" 
    }, { status: 401 });
  }

  const client = await pool.connect();

  try {
    const { userIds, accountManagerId } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs are required' }, { status: 400 });
    }

    // Validate that account manager exists and is an admin (if provided)
    if (accountManagerId) {
      const accountManagerQuery = `
        SELECT id, role
        FROM users
        WHERE id = $1 AND role IN ('admin', 'standard_admin', 'super_admin', 'superadmin')
      `;
      
      const accountManagerResult = await client.query(accountManagerQuery, [accountManagerId]);
      
      if (accountManagerResult.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid account manager' }, { status: 400 });
      }
    }

    // Update user assignments
    const updateQuery = `
      UPDATE users 
      SET account_manager_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2::integer[])
    `;
    
    await client.query(updateQuery, [accountManagerId || null, userIds]);

    return NextResponse.json({
      success: true,
      message: `Successfully ${accountManagerId ? 'assigned' : 'unassigned'} ${userIds.length} user(s)`
    });

  } catch (error) {
    console.error('Error updating user assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}