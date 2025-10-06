import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkOrderUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database successfully');

    // Check unique users in orders table
    console.log('\n=== Unique users in orders table ===');
    const usersInOrders = await client.query(`
      SELECT DISTINCT user_email, user_name, user_id, 
             COUNT(*) as order_count,
             COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed_count
      FROM orders 
      GROUP BY user_email, user_name, user_id
      ORDER BY order_count DESC;
    `);
    
    console.log('Users found in orders:');
    usersInOrders.rows.forEach(row => {
      console.log(`  Email: ${row.user_email}, Name: ${row.user_name}, ID: ${row.user_id}`);
      console.log(`    Total orders: ${row.order_count}, Processed: ${row.processed_count}`);
      console.log('');
    });

    // Check if any users from users table exist in orders
    console.log('\n=== Users table emails that exist in orders ===');
    const matchingUsers = await client.query(`
      SELECT u.id, u.name, u.email,
             COUNT(o.id) as order_count,
             COUNT(CASE WHEN o.status = 'processed' THEN 1 END) as processed_count
      FROM users u
      LEFT JOIN orders o ON u.email = o.user_email
      GROUP BY u.id, u.name, u.email
      HAVING COUNT(o.id) > 0
      ORDER BY order_count DESC;
    `);
    
    if (matchingUsers.rows.length > 0) {
      console.log('Matching users:');
      matchingUsers.rows.forEach(row => {
        console.log(`  ID: ${row.id}, Email: ${row.email}, Name: ${row.name}`);
        console.log(`    Orders: ${row.order_count}, Processed: ${row.processed_count}`);
        console.log('');
      });
    } else {
      console.log('No users from users table have orders');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkOrderUsers();