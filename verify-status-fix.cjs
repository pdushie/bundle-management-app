require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function verifyStatusFix() {
  let client;
  
  try {
    console.log('Verifying the status fix...');
    
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
      connectionString,
      ssl: connectionString.includes('postgres://') ? { rejectUnauthorized: false } : false
    });
    
    client = await pool.connect();
    
    // Check the current status of all entries in processed orders
    const result = await client.query(`
      SELECT 
        o.id as order_id,
        o.user_name,
        o.status as order_status,
        COUNT(oe.id) as total_entries,
        COUNT(CASE WHEN oe.status = 'sent' THEN 1 END) as sent_entries,
        COUNT(CASE WHEN oe.status = 'pending' THEN 1 END) as pending_entries,
        COUNT(CASE WHEN oe.status = 'error' THEN 1 END) as error_entries
      FROM orders o
      LEFT JOIN order_entries oe ON o.id = oe.order_id
      WHERE o.status = 'processed'
      GROUP BY o.id, o.user_name, o.status
      ORDER BY o.id
    `);
    
    console.log('\nProcessed Orders Status Summary:');
    console.log('================================');
    
    result.rows.forEach(row => {
      console.log(`Order: ${row.order_id}`);
      console.log(`  User: ${row.user_name}`);
      console.log(`  Status: ${row.order_status}`);
      console.log(`  Total Entries: ${row.total_entries}`);
      console.log(`  Sent: ${row.sent_entries}`);
      console.log(`  Pending: ${row.pending_entries}`);
      console.log(`  Error: ${row.error_entries}`);
      console.log('');
    });
    
    // Show a sample of entries from one processed order
    const sampleResult = await client.query(`
      SELECT 
        o.id as order_id,
        o.status as order_status,
        oe.number,
        oe.allocation_gb,
        oe.status as entry_status
      FROM orders o
      JOIN order_entries oe ON o.id = oe.order_id
      WHERE o.status = 'processed'
      LIMIT 5
    `);
    
    console.log('Sample entries from processed orders:');
    console.log('====================================');
    console.table(sampleResult.rows);
    
  } catch (error) {
    console.error('❌ Error verifying status fix:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

verifyStatusFix()
  .then(() => {
    console.log('Verification completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });