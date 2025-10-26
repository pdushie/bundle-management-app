const { Client } = require('pg');
const fs = require('fs');

async function debugUserBilling() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    const userEmail = 'boadu.godfred419@gmail.com';
    const targetDate = '2025-10-26';
    
    // Parse the date
    const dateParts = targetDate.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed in JS
    const day = parseInt(dateParts[2]);
    
    const date = new Date(year, month, day);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log(`Debugging billing for ${userEmail} on ${targetDate}`);
    console.log(`Date bounds: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
    console.log(`Timestamp range: ${startOfDay.getTime()} to ${endOfDay.getTime()}`);
    console.log('');
    
    // First, check if user exists
    const userQuery = 'SELECT id, email, created_at FROM users WHERE email = $1';
    const userResult = await client.query(userQuery, [userEmail]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found in database');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created At: ${user.created_at}`);
    console.log('');
    
    // Find orders for the specific date
    const ordersQuery = `
      SELECT id, user_email, timestamp, cost, estimated_cost, status, total_data, created_at
      FROM orders 
      WHERE user_email = $1 
        AND timestamp >= $2 
        AND timestamp <= $3
      ORDER BY timestamp DESC
    `;
    
    const ordersResult = await client.query(ordersQuery, [
      userEmail, 
      startOfDay.getTime(), 
      endOfDay.getTime()
    ]);
    
    console.log(`📋 Found ${ordersResult.rows.length} orders on ${targetDate}:`);
    
    if (ordersResult.rows.length === 0) {
      console.log('   No orders found for this date');
      
      // Check for orders around that date (±3 days)
      const extendedStartDate = new Date(startOfDay);
      extendedStartDate.setDate(extendedStartDate.getDate() - 3);
      const extendedEndDate = new Date(endOfDay);
      extendedEndDate.setDate(extendedEndDate.getDate() + 3);
      
      const extendedQuery = `
        SELECT id, user_email, timestamp, cost, estimated_cost, status, total_data, created_at
        FROM orders 
        WHERE user_email = $1 
          AND timestamp >= $2 
          AND timestamp <= $3
        ORDER BY timestamp DESC
        LIMIT 10
      `;
      
      const extendedResult = await client.query(extendedQuery, [
        userEmail,
        extendedStartDate.getTime(),
        extendedEndDate.getTime()
      ]);
      
      console.log(`\n🔍 Orders within ±3 days of ${targetDate}:`);
      extendedResult.rows.forEach((order, index) => {
        let dateStr = 'Invalid Date';
        try {
          const orderDate = new Date(order.timestamp);
          if (isNaN(orderDate.getTime())) {
            dateStr = `Invalid timestamp: ${order.timestamp}`;
          } else {
            dateStr = `${orderDate.toISOString()} (${orderDate.toLocaleDateString()})`;
          }
        } catch (e) {
          dateStr = `Error parsing timestamp: ${order.timestamp}`;
        }
        
        console.log(`   ${index + 1}. Order ID: ${order.id}`);
        console.log(`      Date: ${dateStr}`);
        console.log(`      Cost: ${order.cost}, Estimated: ${order.estimated_cost}`);
        console.log(`      Status: ${order.status}, Total Data: ${order.total_data}`);
        console.log('');
      });
      
    } else {
      let totalCost = 0;
      let totalData = 0;
      
      for (let i = 0; i < ordersResult.rows.length; i++) {
        const order = ordersResult.rows[i];
        let orderDate;
        let dateStr = 'Invalid Date';
        try {
          orderDate = new Date(order.timestamp);
          if (isNaN(orderDate.getTime())) {
            dateStr = `Invalid timestamp: ${order.timestamp}`;
          } else {
            dateStr = `${orderDate.toISOString()} (${orderDate.toLocaleDateString()} ${orderDate.toLocaleTimeString()})`;
          }
        } catch (e) {
          dateStr = `Error parsing timestamp: ${order.timestamp}`;
        }
        
        console.log(`   ${i + 1}. Order ID: ${order.id}`);
        console.log(`      Timestamp: ${order.timestamp}`);
        console.log(`      Date: ${dateStr}`);
        console.log(`      Cost: ${order.cost}`);
        console.log(`      Estimated Cost: ${order.estimated_cost}`);
        console.log(`      Status: ${order.status}`);
        console.log(`      Total Data: ${order.total_data}`);
        console.log(`      Created At: ${order.created_at}`);
        
        // Get order entries
        const entriesQuery = 'SELECT * FROM order_entries WHERE order_id = $1';
        const entriesResult = await client.query(entriesQuery, [order.id]);
        console.log(`      Order Entries: ${entriesResult.rows.length}`);
        
        if (entriesResult.rows.length > 0) {
          entriesResult.rows.forEach((entry, entryIndex) => {
            console.log(`        ${entryIndex + 1}. Entry ID: ${entry.id}`);
            console.log(`           Number: ${entry.number}`);
            console.log(`           Allocation: ${entry.allocation_gb} GB`);
            console.log(`           Cost: ${entry.cost}`);
          });
        }
        
        // Calculate totals
        const orderCost = parseFloat(order.estimated_cost) || parseFloat(order.cost) || 0;
        const orderData = parseFloat(order.total_data) || 0;
        
        totalCost += orderCost;
        totalData += orderData;
        
        console.log('');
      }
      
      console.log(`📊 Summary for ${userEmail} on ${targetDate}:`);
      console.log(`   Total Orders: ${ordersResult.rows.length}`);
      console.log(`   Total Cost: $${totalCost.toFixed(2)}`);
      console.log(`   Total Data: ${totalData} MB`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

debugUserBilling();