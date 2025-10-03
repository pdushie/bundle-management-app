require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkUserEmails() {
  let client;
  
  try {
    console.log('Checking user emails in orders...');
    
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
      connectionString: connectionString,
    });
    
    client = await pool.connect();
    
    // Get distinct user emails from orders
    const result = await client.query(`
      SELECT user_email, COUNT(*) as order_count
      FROM orders 
      GROUP BY user_email
      ORDER BY order_count DESC
    `);
    
    console.log('\nUser emails with orders:');
    result.rows.forEach(row => {
      console.log(`  ${row.user_email}: ${row.order_count} orders`);
    });
    
  } catch (error) {
    console.error('Error checking user emails:', error);
  } finally {
    if (client) {
      client.release();
    }
    process.exit(0);
  }
}

checkUserEmails();