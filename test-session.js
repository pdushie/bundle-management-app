// Test script to debug session authentication issues
// Run with: npm run test-session

const fetch = require('node-fetch');

async function testSession() {
  console.log('Testing session authentication...');
  
  try {
    // Test debug session endpoint
    const debugResponse = await fetch('http://localhost:3000/api/debug/session');
    const debugData = await debugResponse.json();
    
    console.log('Debug session response:', JSON.stringify(debugData, null, 2));
    
    // Test admin users endpoint
    const usersResponse = await fetch('http://localhost:3000/api/admin/users');
    const usersData = await usersResponse.text();
    
    console.log('Admin users response status:', usersResponse.status);
    console.log('Admin users response:', usersData);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testSession();