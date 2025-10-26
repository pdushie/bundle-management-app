const { Client } = require('pg');

async function testFixedQuery() {
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    const targetDate = '2025-10-26';
    const userIdInt = 21; // boadu.godfred419@gmail.com
    
    // Parse date as UTC and get UNIX timestamps (same as API)
    const startTimestamp = new Date(targetDate + 'T00:00:00.000Z').getTime();
    const endTimestamp = new Date(targetDate + 'T23:59:59.999Z').getTime();
    
    console.log(`Testing FIXED query for User ID: ${userIdInt} on ${targetDate}`);
    console.log('=================================================================');
    
    // Test the FIXED query (with user filtering)
    const fixedQuery = `
      SELECT *
      FROM orders 
      WHERE timestamp >= $1 
        AND timestamp <= $2 
        AND date = $3
        AND user_id = $4
      ORDER BY timestamp
    `;
    
    const result = await client.query(fixedQuery, [startTimestamp, endTimestamp, targetDate, userIdInt]);
    
    console.log(`✅ Found ${result.rows.length} orders for user ID ${userIdInt} on ${targetDate}:`);
    
    let totalCost = 0;
    let totalData = 0;
    
    result.rows.forEach((order, index) => {
      const orderCost = parseFloat(order.estimated_cost) || parseFloat(order.cost) || 0;
      const orderData = parseFloat(order.total_data) || 0;
      
      totalCost += orderCost;
      totalData += orderData;
      
      console.log(`   ${index + 1}. Order: ${order.id}`);
      console.log(`      User Email: ${order.user_email}`);
      console.log(`      Cost: $${orderCost.toFixed(2)}`);
      console.log(`      Data: ${orderData} GB`);
      console.log('');
    });
    
    console.log('📊 FIXED API TOTALS:');
    console.log(`   Total Orders: ${result.rows.length}`);
    console.log(`   Total Cost: $${totalCost.toFixed(2)}`);
    console.log(`   Total Data: ${totalData} GB`);
    console.log('');
    
    console.log('🎯 COMPARISON:');
    console.log(`   Before Fix (ALL USERS): $70,629.90`);
    console.log(`   After Fix (SPECIFIC USER): $${totalCost.toFixed(2)}`);
    console.log(`   Expected: $684.40`);
    
    if (Math.abs(totalCost - 684.40) < 0.01) {
      console.log('   ✅ SUCCESS! The fix resolves the billing calculation issue.');
    } else {
      console.log('   ❌ Something is still wrong with the calculation.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

testFixedQuery();