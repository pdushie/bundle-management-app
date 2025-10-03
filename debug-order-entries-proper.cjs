require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function debugOrderEntries() {
  let client;
  
  try {
    console.log('Debugging order entries...');
    
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
      connectionString: connectionString,
    });
    
    client = await pool.connect();
    
    // Get sample orders
    const ordersResult = await client.query(`
      SELECT id, user_email, status, total_count, created_at 
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    console.log(`\nFound ${ordersResult.rows.length} orders:`);
    
    for (const order of ordersResult.rows) {
      console.log(`\nOrder: ${order.id} (${order.user_email}, ${order.status}, ${order.total_count} entries)`);
      
      // Get entries for this order
      const entriesResult = await client.query(`
        SELECT id, number, allocation_gb, status, cost 
        FROM order_entries 
        WHERE order_id = $1 
        LIMIT 5
      `, [order.id]);
      
      console.log(`  Found ${entriesResult.rows.length} entries in database:`);
      entriesResult.rows.forEach((entry, idx) => {
        console.log(`    ${idx + 1}. ${entry.number} - ${entry.allocation_gb}GB - ${entry.status} - Cost: ${entry.cost}`);
      });
    }
    
  } catch (error) {
    console.error('Error debugging order entries:', error);
  } finally {
    if (client) {
      client.release();
    }
    process.exit(0);
  }
}

debugOrderEntries();