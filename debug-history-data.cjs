// Debug script to check recent order data and history entries
// Run with: node debug-history-data.js

const { Pool } = require('pg');

async function debugHistoryData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('=== Debugging History Data Issues ===');
    
    // Check recent orders
    console.log('\n1. Recent processed orders (last 30 days):');
    const recentOrders = await pool.query(`
      SELECT id, date, timestamp, status, total_data, total_count
      FROM orders 
      WHERE timestamp >= $1 AND status = 'processed'
      ORDER BY timestamp DESC
      LIMIT 10
    `, [Date.now() - (30 * 24 * 60 * 60 * 1000)]);
    
    console.log(`Found ${recentOrders.rows.length} recent processed orders:`);
    recentOrders.rows.forEach(order => {
      const date = new Date(order.timestamp);
      console.log(`- Order ${order.id}: ${order.date} (${date.toLocaleDateString()}) - ${order.total_data}GB, ${order.total_count} entries`);
    });
    
    // Check recent history entries
    console.log('\n2. Recent history entries (last 30 days):');
    const recentHistory = await pool.query(`
      SELECT id, date, timestamp, total_gb, valid_count, invalid_count, type
      FROM history_entries 
      WHERE timestamp >= $1
      ORDER BY timestamp DESC
      LIMIT 10
    `, [Date.now() - (30 * 24 * 60 * 60 * 1000)]);
    
    console.log(`Found ${recentHistory.rows.length} recent history entries:`);
    recentHistory.rows.forEach(entry => {
      console.log(`- History ${entry.id}:`);
      console.log(`  Date field: '${entry.date}' (type: ${typeof entry.date})`);
      console.log(`  Timestamp: ${entry.timestamp} -> ${new Date(entry.timestamp).toLocaleDateString()}`);
      console.log(`  Data: ${entry.total_gb}GB, ${entry.valid_count + entry.invalid_count} entries`);
      console.log('');
    });
    
    // Check for orders without history entries
    console.log('\n3. Processed orders without history entries:');
    const orphanOrders = await pool.query(`
      SELECT o.id, o.date, o.timestamp, o.total_data, o.total_count
      FROM orders o
      LEFT JOIN history_entries h ON h.id LIKE 'hist-' || o.id || '-%'
      WHERE o.status = 'processed' 
        AND h.id IS NULL
        AND o.timestamp >= $1
      ORDER BY o.timestamp DESC
    `, [Date.now() - (30 * 24 * 60 * 60 * 1000)]);
    
    console.log(`Found ${orphanOrders.rows.length} processed orders without history entries:`);
    orphanOrders.rows.forEach(order => {
      const date = new Date(order.timestamp);
      console.log(`- Order ${order.id}: ${order.date} (${date.toLocaleDateString()}) - MISSING HISTORY`);
    });
    
    // Check most recent dates in each table
    console.log('\n4. Most recent dates:');
    
    const latestOrder = await pool.query(`
      SELECT MAX(timestamp) as latest_timestamp, MAX(date) as latest_date
      FROM orders WHERE status = 'processed'
    `);
    if (latestOrder.rows[0].latest_timestamp) {
      const latestOrderDate = new Date(latestOrder.rows[0].latest_timestamp);
      console.log(`- Latest processed order: ${latestOrder.rows[0].latest_date} (${latestOrderDate.toLocaleDateString()})`);
    } else {
      console.log('- No processed orders found');
    }
    
    const latestHistory = await pool.query(`
      SELECT MAX(timestamp) as latest_timestamp, MAX(date) as latest_date
      FROM history_entries
    `);
    if (latestHistory.rows[0].latest_timestamp) {
      const latestHistoryDate = new Date(latestHistory.rows[0].latest_timestamp);
      console.log(`- Latest history entry: ${latestHistory.rows[0].latest_date} (${latestHistoryDate.toLocaleDateString()})`);
    } else {
      console.log('- No history entries found');
    }
    
  } catch (error) {
    console.error('Error debugging history data:', error);
  } finally {
    await pool.end();
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

debugHistoryData().catch(console.error);