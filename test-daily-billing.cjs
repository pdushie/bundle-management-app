const https = require('https');
const { Client } = require('pg');

async function testDailyBillingAPI() {
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });
  
  const userEmail = 'boadu.godfred419@gmail.com';
  const targetDate = '2025-10-26';
  
  try {
    console.log(`Testing Daily Billing API for ${userEmail} on ${targetDate}`);
    console.log('============================================================');
    
    // Test the actual API endpoint that the frontend uses
    const url = `http://localhost:3000/api/billing/daily?userEmail=${encodeURIComponent(userEmail)}&date=${targetDate}`;
    
    console.log(`Calling URL: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`HTTP Status: ${response.status} ${response.statusText}`);
      console.log('Response Headers:');
      for (const [key, value] of response.headers.entries()) {
        console.log(`  ${key}: ${value}`);
      }
      
      const text = await response.text();
      console.log('Response Body:');
      console.log(text.substring(0, 500) + (text.length > 500 ? '...' : ''));
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ API Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Compare with our direct database query
    console.log('\n============================================================');
    console.log('📊 Comparison Summary:');
    console.log(`   From API: Total Amount = $${data.totalAmount}, Total Data = ${data.totalData}MB`);
    console.log(`   From DB Query: Total Amount = $684.40, Total Data = 188MB`);
    
    if (Math.abs(parseFloat(data.totalAmount) - 684.40) < 0.01) {
      console.log('✅ API and DB query results match!');
    } else {
      console.log('❌ API and DB query results do NOT match!');
      console.log('   This indicates a billing calculation discrepancy.');
    }
    
  } catch (error) {
    console.error('❌ Error calling API:', error);
  }
}

testDailyBillingAPI();