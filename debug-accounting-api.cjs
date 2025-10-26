const { Client } = require('pg');

async function debugAccountingAPI() {
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
    const userId = 21; // From our previous debugging
    
    console.log(`Testing Accounting API logic for User ID: ${userId}, Email: ${userEmail}, Date: ${targetDate}`);
    console.log('================================================================================');
    
    // Parse date as UTC and get UNIX timestamps (same as API)
    const startTimestamp = new Date(targetDate + 'T00:00:00.000Z').getTime();
    const endTimestamp = new Date(targetDate + 'T23:59:59.999Z').getTime();
    
    console.log(`Date range: ${new Date(startTimestamp).toISOString()} to ${new Date(endTimestamp).toISOString()}`);
    console.log(`Timestamp range: ${startTimestamp} to ${endTimestamp}`);
    console.log('');
    
    // Query exactly as the API does (without user filtering - this is the bug!)
    const apiQuery = `
      SELECT *
      FROM orders 
      WHERE timestamp >= $1 
        AND timestamp <= $2 
        AND date = $3
      ORDER BY timestamp
    `;
    
    console.log('🐛 Running API query (WITHOUT user filtering - this is the bug):');
    const apiResult = await client.query(apiQuery, [startTimestamp, endTimestamp, targetDate]);
    
    console.log(`Found ${apiResult.rows.length} orders for ALL USERS on ${targetDate}:`);
    
    let totalAllUsers = 0;
    let totalDataAllUsers = 0;
    const userTotals = {};
    
    apiResult.rows.forEach((order, index) => {
      const orderCost = parseFloat(order.estimated_cost) || parseFloat(order.cost) || 0;
      const orderData = parseFloat(order.total_data) || 0;
      
      totalAllUsers += orderCost;
      totalDataAllUsers += orderData;
      
      // Track per user
      if (!userTotals[order.user_email]) {
        userTotals[order.user_email] = { cost: 0, data: 0, orders: 0 };
      }
      userTotals[order.user_email].cost += orderCost;
      userTotals[order.user_email].data += orderData;
      userTotals[order.user_email].orders += 1;
      
      console.log(`   ${index + 1}. Order: ${order.id}`);
      console.log(`      User: ${order.user_email}`);
      console.log(`      Cost: $${orderCost.toFixed(2)}`);
      console.log(`      Data: ${orderData} GB`);
      console.log('');
    });
    
    console.log('📊 TOTALS FROM API QUERY (ALL USERS):');
    console.log(`   Total Orders: ${apiResult.rows.length}`);
    console.log(`   Total Cost: $${totalAllUsers.toFixed(2)}`);
    console.log(`   Total Data: ${totalDataAllUsers} GB`);
    console.log('');
    
    console.log('👥 BREAKDOWN BY USER:');
    Object.entries(userTotals).forEach(([email, totals]) => {
      console.log(`   ${email}:`);
      console.log(`     Orders: ${totals.orders}`);
      console.log(`     Cost: $${totals.cost.toFixed(2)}`);
      console.log(`     Data: ${totals.data} GB`);
    });
    console.log('');
    
    // Now do the CORRECT query (with user filtering)
    console.log('✅ Running CORRECTED query (WITH user filtering):');
    const correctedQuery = `
      SELECT *
      FROM orders 
      WHERE timestamp >= $1 
        AND timestamp <= $2 
        AND date = $3
        AND user_email = $4
      ORDER BY timestamp
    `;
    
    const correctedResult = await client.query(correctedQuery, [startTimestamp, endTimestamp, targetDate, userEmail]);
    
    console.log(`Found ${correctedResult.rows.length} orders for ${userEmail} on ${targetDate}:`);
    
    let totalSpecificUser = 0;
    let totalDataSpecificUser = 0;
    
    correctedResult.rows.forEach((order, index) => {
      const orderCost = parseFloat(order.estimated_cost) || parseFloat(order.cost) || 0;
      const orderData = parseFloat(order.total_data) || 0;
      
      totalSpecificUser += orderCost;
      totalDataSpecificUser += orderData;
      
      console.log(`   ${index + 1}. Order: ${order.id}`);
      console.log(`      Cost: $${orderCost.toFixed(2)}`);
      console.log(`      Data: ${orderData} GB`);
      console.log('');
    });
    
    console.log('📊 TOTALS FROM CORRECTED QUERY (SPECIFIC USER):');
    console.log(`   Total Orders: ${correctedResult.rows.length}`);
    console.log(`   Total Cost: $${totalSpecificUser.toFixed(2)}`);
    console.log(`   Total Data: ${totalDataSpecificUser} GB`);
    console.log('');
    
    console.log('🔍 ISSUE DIAGNOSIS:');
    console.log(`   API shows (ALL USERS): $${totalAllUsers.toFixed(2)}`);
    console.log(`   Should show (SPECIFIC USER): $${totalSpecificUser.toFixed(2)}`);
    console.log(`   Difference: $${(totalAllUsers - totalSpecificUser).toFixed(2)}`);
    
    if (totalAllUsers > totalSpecificUser) {
      console.log('   ❌ THE API IS INCORRECTLY SUMMING ALL USERS INSTEAD OF JUST THE SELECTED USER!');
    } else {
      console.log('   ✅ Totals match - no issue found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

debugAccountingAPI();