require('dotenv').config({ path: '.env.local' });

async function testTrackAPI() {
  console.log('🔍 Testing the track API endpoint...\n');
  
  try {
    // Test the filter API with the specific phone number
    const response = await fetch('http://localhost:3000/api/orders/track/filter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'next-auth.session-token=test' // Might need proper session
      },
      body: JSON.stringify({
        phoneNumber: '0249651750'
      })
    });
    
    if (!response.ok) {
      console.log(`API returned status: ${response.status}`);
      console.log('Response:', await response.text());
      return;
    }
    
    const data = await response.json();
    console.log('API Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Look specifically at entries with our phone number
    if (data.orderEntries) {
      const matchingEntries = data.orderEntries.filter(entry => 
        entry.number && entry.number.includes('0249651750')
      );
      
      console.log(`\nFound ${matchingEntries.length} matching entries:`);
      matchingEntries.forEach((entry, index) => {
        console.log(`\nEntry ${index + 1}:`);
        console.log(`Number: ${entry.number}`);
        console.log(`Source: ${entry.source}`);
        console.log(`Admin Info:`, entry.adminInfo);
      });
    }
    
  } catch (error) {
    console.error('❌ Error calling API:', error.message);
    console.log('\nNote: This might fail if the server is not running or requires authentication.');
  }
}

testTrackAPI().then(() => process.exit(0));