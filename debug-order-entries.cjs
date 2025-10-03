const { neonClient } = require('./src/lib/db.js');

async function checkOrderEntries() {
  try {
    console.log('Checking order-entry relationship in database...');
    
    // Get sample orders
    const orders = await neonClient`
      SELECT id, user_email, status, total_count, created_at 
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 3
    `;
    
    console.log(`\nFound ${orders.length} orders:`);
    
    for (const order of orders) {
      console.log(`\nOrder: ${order.id} (${order.user_email}, ${order.status}, ${order.total_count} entries)`);
      
      // Get entries for this order
      const entries = await neonClient`
        SELECT id, number, allocation_gb, status, cost 
        FROM order_entries 
        WHERE order_id = ${order.id} 
        LIMIT 5
      `;
      
      console.log(`  Found ${entries.length} entries in database:`);
      entries.forEach((entry, idx) => {
        console.log(`    ${idx + 1}. ${entry.number} - ${entry.allocation_gb}GB - ${entry.status} - Cost: ${entry.cost}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking order entries:', error);
  } finally {
    process.exit(0);
  }
}

checkOrderEntries();