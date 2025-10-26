const https = require('https');
const fs = require('fs');

async function testBillingAPI() {
  try {
    console.log('Testing Billing API for boadu.godfred419@gmail.com on 2025-10-26');
    
    const url = 'http://localhost:3000/api/debug/user-billing?email=boadu.godfred419@gmail.com&date=2025-10-26';
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('API Response:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error calling API:', error);
  }
}

testBillingAPI();