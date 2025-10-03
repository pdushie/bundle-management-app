const { neonClient } = require('./src/lib/db.js');

async function checkOrders() {
  try {
    console.log('Checking orders and their entries...');
    
    // Get orders and their entries
    const orders = await neonClient`SELECT id, user_email, status, total_count FROM orders LIMIT 5`;
    console.log('Sample orders:');
    console.log(orders);
    
    if (orders.length > 0) {
      const orderId = orders[0].id;
      console.log(`\nChecking entries for order ${orderId}:`);
      const entries = await neonClient`SELECT * FROM order_entries WHERE order_id = ${orderId} LIMIT 3`;
      console.log(`Found ${entries.length} entries:`);
      console.log(entries);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkOrders();