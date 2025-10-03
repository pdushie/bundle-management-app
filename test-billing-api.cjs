require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function simulateBillingAPI() {
  let client;
  
  try {
    console.log('Simulating billing API call...');
    
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
      connectionString: connectionString,
    });
    
    client = await pool.connect();
    
    // Use the same date as today for testing
    const selectedDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log(`Testing date: ${selectedDate}`);
    
    // Get orders for today (simulating the API logic)
    const ordersResult = await client.query(`
      SELECT id, user_email, status, total_count, total_data, estimated_cost, pricing_profile_name, timestamp 
      FROM orders 
      WHERE DATE(to_timestamp(timestamp / 1000)) = $1
      ORDER BY timestamp DESC
    `, [selectedDate]);
    
    console.log(`\nFound ${ordersResult.rows.length} orders for ${selectedDate}:`);
    
    // For each order, get its entries (simulating the API logic)
    const ordersWithEntries = [];
    
    for (const order of ordersResult.rows) {
      const entriesResult = await client.query(`
        SELECT id, number, allocation_gb, status, cost 
        FROM order_entries 
        WHERE order_id = $1 
        ORDER BY id
      `, [order.id]);
      
      console.log(`Order ${order.id}: ${entriesResult.rows.length} entries`);
      
      ordersWithEntries.push({
        ...order,
        entries: entriesResult.rows
      });
    }
    
    // Print the final result that would be sent to frontend
    console.log('\nFinal API response structure:');
    console.log(JSON.stringify({
      date: selectedDate,
      totalData: ordersWithEntries.reduce((sum, o) => sum + parseFloat(o.total_data || 0), 0),
      totalAmount: ordersWithEntries.reduce((sum, o) => sum + parseFloat(o.estimated_cost || 0), 0),
      orders: ordersWithEntries.map(order => ({
        id: order.id,
        time: new Date(order.timestamp).toLocaleTimeString(),
        totalCount: order.total_count,
        totalData: parseFloat(order.total_data),
        status: order.status,
        pricingProfileName: order.pricing_profile_name || undefined,
        estimatedCost: parseFloat(order.estimated_cost || 0),
        entries: order.entries || []
      }))
    }, null, 2));
    
  } catch (error) {
    console.error('Error simulating billing API:', error);
  } finally {
    if (client) {
      client.release();
    }
    process.exit(0);
  }
}

simulateBillingAPI();