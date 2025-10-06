import fetch from 'node-fetch';

async function testUserPackageBreakdown() {
  try {
    // Test with user ID 12 (normal.user@test.com) on date 2025-10-03
    const userId = 12;
    const date = '2025-10-03';
    
    console.log('Testing user package breakdown API...');
    console.log(`User ID: ${userId}, Date: ${date}`);
    
    const response = await fetch(
      `http://localhost:3000/api/admin/accounting/user-package-breakdown?userId=${userId}&date=${date}`,
      {
        headers: {
          'Cookie': 'next-auth.session-token=test-session'
        }
      }
    );
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('Error response:', error);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testUserPackageBreakdown();