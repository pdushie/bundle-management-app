const { neonClient } = require('./src/lib/db');

async function checkDatabaseOrderCosts() {
  try {
    console.log('\nFetching sample orders...');
    const orders = await neonClient`SELECT id, status, cost, estimated_cost, pricing_profile_name FROM orders ORDER BY timestamp DESC LIMIT 5`;
    
    if (orders.length === 0) {
      console.log('No orders found in database.');
    } else {
      console.log('Sample orders:');
      orders.forEach(order => {
        console.log('Order ID:', order.id);
        console.log('  Status:', order.status);
        console.log('  Cost:', order.cost);
        console.log('  EstimatedCost:', order.estimated_cost);
        console.log('  Profile:', order.pricing_profile_name || 'None');
        console.log('---');
      });
    }
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkDatabaseOrderCosts();
