const { Client } = require('pg');

async function debugUserFields() {
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    const userEmail = 'boadu.godfred419@gmail.com';
    const targetDate = '2025-10-26';
    const userIdInt = 21;
    
    console.log(`Debugging user field population for ${userEmail} (ID: ${userIdInt}) on ${targetDate}`);
    console.log('==================================================================================');
    
    // Check what user-related fields exist in the orders
    const orderFieldsQuery = `
      SELECT 
        id, 
        user_email, 
        user_id, 
        user_name,
        date,
        estimated_cost,
        cost,
        total_data
      FROM orders 
      WHERE user_email = $1 
        AND date = $2
      ORDER BY timestamp
    `;
    
    const result = await client.query(orderFieldsQuery, [userEmail, targetDate]);
    
    console.log(`Found ${result.rows.length} orders for ${userEmail} on ${targetDate}:`);
    
    result.rows.forEach((order, index) => {
      console.log(`   ${index + 1}. Order: ${order.id}`);
      console.log(`      user_email: ${order.user_email}`);
      console.log(`      user_id: ${order.user_id} (${typeof order.user_id})`);
      console.log(`      user_name: ${order.user_name}`);
      console.log(`      date: ${order.date}`);
      console.log(`      cost: ${order.cost}`);
      console.log(`      estimated_cost: ${order.estimated_cost}`);
      console.log(`      total_data: ${order.total_data}`);
      console.log('');
    });
    
    // Check if the user_id field is null or different
    const userIdCheckQuery = `
      SELECT 
        user_email,
        user_id,
        COUNT(*) as order_count
      FROM orders 
      WHERE date = $1
      GROUP BY user_email, user_id
      ORDER BY order_count DESC
    `;
    
    const userIdCheck = await client.query(userIdCheckQuery, [targetDate]);
    
    console.log('User ID field analysis for all orders on this date:');
    userIdCheck.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Email: ${row.user_email}`);
      console.log(`      user_id: ${row.user_id} (${typeof row.user_id})`);
      console.log(`      Orders: ${row.order_count}`);
      console.log('');
    });
    
    // Check the users table to confirm the user ID
    const usersQuery = `
      SELECT id, email, name
      FROM users 
      WHERE email = $1
    `;
    
    const userResult = await client.query(usersQuery, [userEmail]);
    
    console.log('User table data:');
    userResult.rows.forEach((user) => {
      console.log(`   ID: ${user.id} (${typeof user.id})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

debugUserFields();