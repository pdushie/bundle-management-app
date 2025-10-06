import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugUserPackages() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database successfully');

    // Check if tables exist
    console.log('\n=== Checking table existence ===');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('orders', 'order_entries', 'users')
      ORDER BY table_name;
    `);
    console.log('Tables found:', tablesResult.rows.map(r => r.table_name));

    // Check users table
    console.log('\n=== Users table sample ===');
    const usersResult = await client.query(`
      SELECT id, name, email 
      FROM users 
      ORDER BY id 
      LIMIT 5;
    `);
    console.log(`Found ${usersResult.rows.length} users (showing first 5):`);
    usersResult.rows.forEach(user => {
      console.log(`  ID: ${user.id}, Name: ${user.name}, Email: ${user.email}`);
    });

    // Check orders table structure
    console.log('\n=== Orders table structure ===');
    const ordersStructure = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log('Orders columns:');
    ordersStructure.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Check orders table data
    console.log('\n=== Orders table sample data ===');
    const ordersResult = await client.query(`
      SELECT id, date, user_name, user_email, user_id, status, total_data, total_count, cost
      FROM orders 
      ORDER BY date DESC, timestamp DESC
      LIMIT 10;
    `);
    console.log(`Found ${ordersResult.rows.length} orders (showing first 10):`);
    ordersResult.rows.forEach(order => {
      console.log(`  Order ID: ${order.id}`);
      console.log(`    Date: ${order.date}, User: ${order.user_name} (${order.user_email})`);
      console.log(`    User ID: ${order.user_id}, Status: ${order.status}`);
      console.log(`    Data: ${order.total_data}GB, Count: ${order.total_count}, Cost: $${order.cost}`);
      console.log('');
    });

    // Check order_entries table structure
    console.log('\n=== Order entries table structure ===');
    const entriesStructure = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'order_entries' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log('Order entries columns:');
    entriesStructure.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Check order_entries table data
    console.log('\n=== Order entries table sample data ===');
    const entriesResult = await client.query(`
      SELECT oe.id, oe.order_id, oe.number, oe.allocation_gb, oe.status, oe.cost,
             o.date, o.user_name, o.user_id
      FROM order_entries oe
      LEFT JOIN orders o ON oe.order_id = o.id
      ORDER BY o.date DESC, oe.id DESC
      LIMIT 20;
    `);
    console.log(`Found ${entriesResult.rows.length} order entries (showing first 20):`);
    entriesResult.rows.forEach(entry => {
      console.log(`  Entry ID: ${entry.id}, Order: ${entry.order_id}`);
      console.log(`    Number: ${entry.number}, Allocation: ${entry.allocation_gb}GB`);
      console.log(`    Status: ${entry.status}, Cost: $${entry.cost}`);
      console.log(`    Order Date: ${entry.date}, User: ${entry.user_name} (ID: ${entry.user_id})`);
      console.log('');
    });

    // Check for processed orders with entries for specific users
    console.log('\n=== Processed orders by user ===');
    const processedOrdersResult = await client.query(`
      SELECT o.user_id, o.user_name, o.date, COUNT(oe.id) as entry_count, 
             SUM(CAST(oe.allocation_gb AS DECIMAL)) as total_allocation
      FROM orders o
      LEFT JOIN order_entries oe ON o.id = oe.order_id
      WHERE o.status = 'processed'
      GROUP BY o.user_id, o.user_name, o.date
      HAVING COUNT(oe.id) > 0
      ORDER BY o.date DESC, total_allocation DESC
      LIMIT 10;
    `);
    console.log(`Found ${processedOrdersResult.rows.length} processed orders with entries:`);
    processedOrdersResult.rows.forEach(row => {
      console.log(`  User ID: ${row.user_id}, Name: ${row.user_name}`);
      console.log(`    Date: ${row.date}, Entries: ${row.entry_count}, Total: ${row.total_allocation}GB`);
      console.log('');
    });

    // Check recent dates for testing
    console.log('\n=== Recent order dates ===');
    const recentDatesResult = await client.query(`
      SELECT DISTINCT date, COUNT(*) as order_count
      FROM orders
      WHERE status = 'processed'
      GROUP BY date
      ORDER BY date DESC
      LIMIT 10;
    `);
    console.log('Recent dates with processed orders:');
    recentDatesResult.rows.forEach(row => {
      console.log(`  Date: ${row.date}, Orders: ${row.order_count}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

debugUserPackages();