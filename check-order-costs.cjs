require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function checkOrderCostColumns() {
  const client = await pool.connect();
  try {
    console.log('=== CHECKING ORDER COST COLUMNS ===\n');
    
    // Check column structure of orders table
    console.log('1. Orders table structure:');
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      ORDER BY ordinal_position
    `);
    console.table(tableStructure.rows);
    
    // Check if cost and estimated_cost columns exist
    console.log('\n2. Cost-related columns in orders table:');
    const costColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('cost', 'estimated_cost')
    `);
    console.table(costColumns.rows);
    
    // Check sample orders with their cost data
    console.log('\n3. Sample orders from last 3 days with cost data:');
    const ordersWithCost = await client.query(`
      SELECT id, user_name, date, total_data, cost, estimated_cost, status
      FROM orders 
      WHERE date >= (CURRENT_DATE - INTERVAL '3 days')::text
      ORDER BY timestamp DESC 
      LIMIT 10
    `);
    console.table(ordersWithCost.rows);
    
    // Check if there are any orders with non-null costs
    console.log('\n4. Count of orders with cost data:');
    const costStats = await client.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(cost) as orders_with_cost,
        COUNT(estimated_cost) as orders_with_estimated_cost,
        SUM(cost) as total_cost_sum,
        SUM(estimated_cost) as total_estimated_cost_sum
      FROM orders 
      WHERE date >= (CURRENT_DATE - INTERVAL '7 days')::text
    `);
    console.table(costStats.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkOrderCostColumns();