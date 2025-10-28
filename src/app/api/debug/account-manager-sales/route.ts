// Debug version of account manager sales API without authentication
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || '2024-12-26';

  const client = await pool.connect();

  try {
    console.log('=== DEBUG ACCOUNT MANAGER SALES ===');
    console.log('Date requested:', date);

    // First, check if cost columns exist
    const columnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('cost', 'estimated_cost')
    `;
    const columns = await client.query(columnsQuery);
    console.log('Cost columns in orders table:', columns.rows);

    // Check sample orders
    const sampleOrdersQuery = `
      SELECT id, user_name, date, total_data, cost, estimated_cost, status
      FROM orders 
      WHERE date >= $1
      ORDER BY timestamp DESC 
      LIMIT 5
    `;
    const sampleOrders = await client.query(sampleOrdersQuery, [date]);
    console.log('Sample orders:', sampleOrders.rows);

    // Check users with account managers
    const usersWithAMQuery = `
      SELECT u.id, u.name, u.email, u.account_manager_id, am.name as am_name
      FROM users u
      LEFT JOIN users am ON u.account_manager_id = am.id
      WHERE u.account_manager_id IS NOT NULL
      LIMIT 5
    `;
    const usersWithAM = await client.query(usersWithAMQuery);
    console.log('Users with account managers:', usersWithAM.rows);

    // Check account managers
    const accountManagersQuery = `
      SELECT id, name, email, role 
      FROM users 
      WHERE role IN ('admin', 'standard_admin', 'super_admin', 'superadmin')
    `;
    const accountManagers = await client.query(accountManagersQuery);
    console.log('Account managers:', accountManagers.rows);

    // Check any recent orders regardless of date for debugging
    const anyRecentOrdersQuery = `
      SELECT o.id, o.user_id, o.date, o.cost, o.estimated_cost, o.total_data, u.account_manager_id
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE u.account_manager_id IS NOT NULL
      ORDER BY o.timestamp DESC
      LIMIT 5
    `;
    const anyRecentOrders = await client.query(anyRecentOrdersQuery);
    console.log('Any recent orders with account managers:', anyRecentOrders.rows);

    // Check if cost columns have any non-null values
    const costStatsQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(cost) as orders_with_cost,
        COUNT(estimated_cost) as orders_with_estimated_cost,
        AVG(cost) as avg_cost,
        AVG(estimated_cost) as avg_estimated_cost,
        SUM(cost) as total_cost,
        SUM(estimated_cost) as total_estimated_cost
      FROM orders
      WHERE date >= (CURRENT_DATE - INTERVAL '7 days')::text
    `;
    const costStats = await client.query(costStatsQuery);
    console.log('Cost statistics for last 7 days:', costStats.rows);

    // The main query with debugging
    const mainQuery = `
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
        ARRAY_AGG(DISTINCT u.id) FILTER (WHERE u.id IS NOT NULL) as assigned_user_ids,
        ARRAY_AGG(DISTINCT o.id) FILTER (WHERE o.id IS NOT NULL) as order_ids
      FROM users am
      LEFT JOIN users u ON u.account_manager_id = am.id
      LEFT JOIN orders o ON o.user_id = u.id AND o.date = $1
      WHERE am.role IN ('admin', 'standard_admin', 'super_admin', 'superadmin')
      GROUP BY am.id, am.name, am.email, am.role
      ORDER BY total_sales DESC, am.name
    `;

    const result = await client.query(mainQuery, [date]);
    console.log('Main query result:', result.rows);

    return NextResponse.json({
      success: true,
      date,
      debug: true,
      columns: columns.rows,
      sampleOrders: sampleOrders.rows,
      usersWithAccountManagers: usersWithAM.rows,
      accountManagers: accountManagers.rows,
      anyRecentOrders: anyRecentOrders.rows,
      costStats: costStats.rows,
      data: result.rows
    });

  } catch (error) {
    console.error('Error in debug account manager sales:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    client.release();
  }
}