const { Client } = require('pg');

async function checkUserOrders() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check for processed orders from seraphgatelimited@gmail.com
    const ordersResult = await client.query(`
      SELECT id, timestamp, date, status, total_count
      FROM orders 
      WHERE user_email = 'seraphgatelimited@gmail.com' 
        AND status = 'processed'
      ORDER BY timestamp DESC
      LIMIT 3
    `);

    console.log(`\n📦 Found ${ordersResult.rows.length} processed orders for seraphgatelimited@gmail.com:`);
    
    for (const order of ordersResult.rows) {
      console.log(`\nOrder: ${order.id}`);
      console.log(`- Date: ${order.date}`);
      console.log(`- Status: ${order.status}`);
      console.log(`- Count: ${order.total_count}`);
      
      // Check entries for this order
      const entriesResult = await client.query(`
        SELECT id, number, allocation_gb, status, cost
        FROM order_entries 
        WHERE order_id = $1
        LIMIT 3
      `, [order.id]);
      
      console.log(`- Entries: ${entriesResult.rows.length}`);
      entriesResult.rows.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.number} (${entry.allocation_gb} GB) - ${entry.status} - ID: ${entry.id}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

checkUserOrders().catch(console.error);