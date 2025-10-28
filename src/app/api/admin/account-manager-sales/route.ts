// API endpoint for account manager sales reporting
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

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const accountManagerId = searchParams.get('accountManagerId');

  if (!date) {
    return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    let query: string;
    let params: any[];

    if (accountManagerId) {
      // Get sales for a specific account manager on a specific date
      query = `
        SELECT 
          am.id as account_manager_id,
          am.name as account_manager_name,
          am.email as account_manager_email,
          am.role as account_manager_role,
          COUNT(DISTINCT u.id) as assigned_users_count,
          COUNT(o.id) as total_orders,
        COALESCE(SUM(o.cost), 0) as total_sales,
        COALESCE(SUM(o.estimated_cost), 0) as total_estimated_sales,
          COALESCE(SUM(o.total_data), 0) as total_data_gb,
          JSON_AGG(
            CASE WHEN o.id IS NOT NULL THEN
              JSON_BUILD_OBJECT(
                'order_id', o.id,
                'user_name', o.user_name,
                'user_email', o.user_email,
                'total_data', o.total_data,
                'cost', COALESCE(o.cost, o.estimated_cost, 0),
                'time', o.time,
                'status', o.status
              )
            END
          ) FILTER (WHERE o.id IS NOT NULL) as orders
        FROM users am
        LEFT JOIN users u ON u.account_manager_id = am.id
        LEFT JOIN orders o ON o.user_email = u.email AND o.date = $2
        WHERE am.id = $1
        AND am.role IN ('admin', 'standard_admin', 'super_admin', 'superadmin')
        GROUP BY am.id, am.name, am.email, am.role
      `;
      params = [accountManagerId, date];
    } else {
      // Get sales summary for all account managers on a specific date
      query = `
        SELECT 
          am.id as account_manager_id,
          am.name as account_manager_name,
          am.email as account_manager_email,
          am.role as account_manager_role,
          COUNT(DISTINCT u.id) as assigned_users_count,
          COUNT(o.id) as total_orders,
          COALESCE(SUM(o.cost), 0) as total_sales,
          COALESCE(SUM(o.estimated_cost), 0) as total_estimated_sales,
          COALESCE(SUM(o.total_data), 0) as total_data_gb
        FROM users am
        LEFT JOIN users u ON u.account_manager_id = am.id
        LEFT JOIN orders o ON o.user_email = u.email AND o.date = $1
        WHERE am.role IN ('admin', 'standard_admin', 'super_admin', 'superadmin')
        GROUP BY am.id, am.name, am.email, am.role
        ORDER BY total_sales DESC, am.name
      `;
      params = [date];
    }

    const result = await client.query(query, params);

    // Convert string values to numbers
    const processedData = result.rows.map(row => ({
      ...row,
      assigned_users_count: parseInt(row.assigned_users_count) || 0,
      total_orders: parseInt(row.total_orders) || 0,
      total_sales: parseFloat(row.total_sales) || 0,
      total_estimated_sales: parseFloat(row.total_estimated_sales) || 0,
      total_data_gb: parseFloat(row.total_data_gb) || 0
    }));

    return NextResponse.json({
      success: true,
      date,
      accountManagerId,
      data: processedData
    });

  } catch (error) {
    console.error('Error fetching account manager sales:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}