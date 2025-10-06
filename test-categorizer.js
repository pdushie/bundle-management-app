import fetch from 'node-fetch';

async function testDataCategorizer() {
  try {
    console.log('Testing data categorizer API...');
    
    const startDate = '2025-10-03';
    const endDate = '2025-10-05';
    
    console.log(`Calling API with dates: ${startDate} to ${endDate}`);
    
    const response = await fetch(
      `http://localhost:3000/api/admin/accounting/data-categorizer?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: {
          'Cookie': 'next-auth.session-token=test-session'
        }
      }
    );
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('API Response:');
      console.log('Summary:', JSON.stringify(data.summary, null, 2));
      console.log('Categories:', data.categories.length);
      console.log('User Breakdowns:', data.userBreakdowns.length);
      
      if (data.categories.length > 0) {
        console.log('First category:', JSON.stringify(data.categories[0], null, 2));
      }
    } else {
      const error = await response.text();
      console.log('Error response:', error);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testDataCategorizer();