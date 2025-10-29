require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function findSpecificOrder() {
  try {
    console.log('=== Looking for 138GB order from user H at 6:57 ===');
    
    // Look for orders that might match the description
    const matchingOrders = await sql`
      SELECT id, status, created_at, processed_at, user_name, total_data
      FROM orders 
      WHERE user_name ILIKE '%H%' 
      AND total_data >= 130 
      AND total_data <= 150
      AND created_at::time BETWEEN '06:50:00' AND '07:05:00'
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    console.log(`\n=== Found ${matchingOrders.length} matching orders ===`);
    matchingOrders.forEach(order => {
      const createdTime = new Date(order.created_at).toLocaleTimeString();
      const processedTime = order.processed_at ? new Date(order.processed_at).toLocaleTimeString() : 'Not processed';
      console.log(`ID: ${order.id}, User: ${order.user_name}, Data: ${order.total_data}GB, Status: "${order.status}", Created: ${createdTime}, Processed: ${processedTime}`);
    });
    
    // Check all recent orders from today
    console.log('\n=== All orders from today ===');
    const todayOrders = await sql`
      SELECT id, status, created_at, processed_at, user_name, total_data
      FROM orders 
      WHERE created_at::date = CURRENT_DATE
      ORDER BY created_at DESC 
      LIMIT 20
    `;
    
    todayOrders.forEach(order => {
      const createdTime = new Date(order.created_at).toLocaleTimeString();
      const processedTime = order.processed_at ? new Date(order.processed_at).toLocaleTimeString() : 'Not processed';
      console.log(`ID: ${order.id}, User: ${order.user_name}, Data: ${order.total_data}GB, Status: "${order.status}", Created: ${createdTime}, Processed: ${processedTime}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findSpecificOrder();