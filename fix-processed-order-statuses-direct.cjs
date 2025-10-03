require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function fixExistingProcessedOrderStatuses() {
  let client;
  
  try {
    console.log('Starting to fix existing processed order entry statuses...');
    
    // Connect to the database using the same environment variables
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable not found');
    }
    
    const pool = new Pool({
      connectionString,
      ssl: connectionString.includes('postgres://') ? { rejectUnauthorized: false } : false
    });
    
    client = await pool.connect();
    
    console.log('Connected to database...');
    
    // First, check current status of entries in processed orders
    const checkResult = await client.query(`
      SELECT 
        o.status as order_status,
        oe.status as entry_status,
        COUNT(*) as count
      FROM orders o
      JOIN order_entries oe ON o.id = oe.order_id
      WHERE o.status = 'processed'
      GROUP BY o.status, oe.status
      ORDER BY oe.status
    `);
    
    console.log('Current status distribution for processed orders:');
    checkResult.rows.forEach(row => {
      console.log(`  Order Status: ${row.order_status}, Entry Status: ${row.entry_status}, Count: ${row.count}`);
    });
    
    // Update all entries of processed orders to 'sent' status if they're currently 'pending'
    const updateResult = await client.query(`
      UPDATE order_entries 
      SET status = 'sent' 
      WHERE order_id IN (
        SELECT id FROM orders WHERE status = 'processed'
      )
      AND status = 'pending'
      RETURNING order_id, number, status
    `);
    
    console.log(`Updated ${updateResult.rowCount} entries from 'pending' to 'sent' status`);
    
    // Show updated status distribution
    const finalCheckResult = await client.query(`
      SELECT 
        o.status as order_status,
        oe.status as entry_status,
        COUNT(*) as count
      FROM orders o
      JOIN order_entries oe ON o.id = oe.order_id
      WHERE o.status = 'processed'
      GROUP BY o.status, oe.status
      ORDER BY oe.status
    `);
    
    console.log('Updated status distribution for processed orders:');
    finalCheckResult.rows.forEach(row => {
      console.log(`  Order Status: ${row.order_status}, Entry Status: ${row.entry_status}, Count: ${row.count}`);
    });
    
    console.log('✅ Successfully updated existing processed order entry statuses!');
    
  } catch (error) {
    console.error('❌ Error updating processed order entry statuses:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Run the migration
fixExistingProcessedOrderStatuses()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });