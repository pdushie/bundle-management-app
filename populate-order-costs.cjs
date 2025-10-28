require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function debugAccountManagerSales() {
  const client = await pool.connect();
  try {
    console.log('=== DEBUGGING ACCOUNT MANAGER SALES (READ ONLY) ===\n');
    
    // Check current cost data status (READ ONLY)
    console.log('1. Current cost data status:');
    const costStats = await client.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(cost) as orders_with_cost,
        COUNT(estimated_cost) as orders_with_estimated_cost,
        SUM(CASE WHEN cost > 0 THEN 1 ELSE 0 END) as orders_with_positive_cost,
        SUM(CASE WHEN estimated_cost > 0 THEN 1 ELSE 0 END) as orders_with_positive_estimated_cost,
        ROUND(AVG(cost), 2) as avg_cost,
        ROUND(SUM(cost), 2) as total_cost
      FROM orders
    `);
    console.table(costStats.rows);
    
    // Check account manager assignments
    console.log('\n2. Users with account managers assigned:');
    const usersWithAM = await client.query(`
      SELECT u.id, u.name, u.email, u.account_manager_id, am.name as manager_name
      FROM users u
      LEFT JOIN users am ON u.account_manager_id = am.id
      WHERE u.account_manager_id IS NOT NULL
      ORDER BY u.account_manager_id
      LIMIT 10
    `);
    console.table(usersWithAM.rows);
    
    // Check recent orders with costs
    console.log('\n3. Recent orders with costs:');
    const recentOrders = await client.query(`
      SELECT 
        o.id, 
        o.user_id,
        o.user_name, 
        o.date, 
        o.cost, 
        o.estimated_cost, 
        o.total_data,
        u.account_manager_id,
        am.name as manager_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN users am ON u.account_manager_id = am.id
      WHERE o.date >= (CURRENT_DATE - INTERVAL '7 days')::text
      AND (o.cost > 0 OR o.estimated_cost > 0)
      ORDER BY o.timestamp DESC 
      LIMIT 10
    `);
    console.table(recentOrders.rows);
    
    // Now test the account manager sales query for recent dates
    console.log('\n4. Testing account manager sales for recent dates:');
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Test for multiple recent dates
    const testDates = [today, yesterdayStr];
    for (let i = 2; i <= 7; i++) {
      const testDate = new Date();
      testDate.setDate(testDate.getDate() - i);
      testDates.push(testDate.toISOString().split('T')[0]);
    }
    
    for (const testDate of testDates) {
      console.log(`\nSales for ${testDate}:`);
      const salesQuery = `
        SELECT 
          am.id as account_manager_id,
          am.name as account_manager_name,
          am.email as account_manager_email,
          COUNT(DISTINCT u.id) as assigned_users_count,
          COUNT(o.id) as total_orders,
          COALESCE(SUM(o.cost), 0) as total_sales,
          COALESCE(SUM(o.estimated_cost), 0) as total_estimated_sales,
          COALESCE(SUM(o.total_data), 0) as total_data_gb
        FROM users am
        LEFT JOIN users u ON u.account_manager_id = am.id
        LEFT JOIN orders o ON o.user_email = u.email AND o.date = $1
        WHERE am.role IN ('admin', 'standard_admin', 'super_admin', 'superadmin')
        GROUP BY am.id, am.name, am.email
        ORDER BY total_sales DESC
      `;
      const salesResult = await client.query(salesQuery, [testDate]);
      if (salesResult.rows.length > 0) {
        const relevantResults = salesResult.rows.filter(row => row.total_orders > 0);
        if (relevantResults.length > 0) {
          console.table(relevantResults);
        } else {
          console.log(`No orders found for ${testDate}`);
        }
      } else {
        console.log(`No account managers found for ${testDate}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

debugAccountManagerSales();