const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function debugAccountManagerSales() {
  const client = await pool.connect();
  try {
    console.log('=== DEBUGGING ACCOUNT MANAGER SALES ===\n');
    
    // Check if there are any users with account_manager_id assigned
    console.log('1. Users with account managers assigned:');
    const usersWithAM = await client.query(`
      SELECT id, name, email, role, account_manager_id 
      FROM users 
      WHERE account_manager_id IS NOT NULL 
      ORDER BY account_manager_id
    `);
    console.table(usersWithAM.rows);
    
    // Check account managers (admin users)
    console.log('\n2. Account managers (admin users):');
    const accountManagers = await client.query(`
      SELECT id, name, email, role 
      FROM users 
      WHERE role IN ('admin', 'standard_admin', 'super_admin', 'superadmin') 
      ORDER BY id
    `);
    console.table(accountManagers.rows);
    
    // Check recent orders with costs
    console.log('\n3. Recent orders with costs:');
    const recentOrders = await client.query(`
      SELECT 
        o.id, 
        o.user_id, 
        o.user_name, 
        o.user_email, 
        o.date, 
        o.cost, 
        o.estimated_cost, 
        o.total_data, 
        o.status,
        u.account_manager_id
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.date >= CURRENT_DATE - INTERVAL '3 days'
      ORDER BY o.timestamp DESC 
      LIMIT 10
    `);
    console.table(recentOrders.rows);
    
    // Test the exact query from the API for today
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n4. Testing account manager sales query for ${today}:`);
    const salesQuery = `
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
      LEFT JOIN orders o ON o.user_id = u.id AND o.date = $1
      WHERE am.role IN ('admin', 'standard_admin', 'super_admin', 'superadmin')
      GROUP BY am.id, am.name, am.email, am.role
      ORDER BY total_sales DESC, am.name
    `;
    const salesResult = await client.query(salesQuery, [today]);
    console.table(salesResult.rows);
    
    // Check the same query for yesterday and a few days back
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    console.log(`\n5. Testing account manager sales query for ${yesterdayStr}:`);
    const salesResultYesterday = await client.query(salesQuery, [yesterdayStr]);
    console.table(salesResultYesterday.rows);
    
    // Check if there are orders without proper cost calculations
    console.log('\n6. Orders with missing or zero costs:');
    const zeroCostOrders = await client.query(`
      SELECT 
        o.id, 
        o.user_id, 
        o.user_name, 
        o.date, 
        o.cost, 
        o.estimated_cost, 
        o.total_data,
        o.status,
        u.account_manager_id
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE (o.cost IS NULL OR o.cost = 0) AND (o.estimated_cost IS NULL OR o.estimated_cost = 0)
      AND o.date >= CURRENT_DATE - INTERVAL '3 days'
      ORDER BY o.timestamp DESC 
      LIMIT 10
    `);
    console.table(zeroCostOrders.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

debugAccountManagerSales();