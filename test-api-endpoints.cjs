require('dotenv').config({ path: '.env.local' });

async function testApiEndpoints() {
  try {
    console.log('=== Testing API Endpoints ===');
    
    // Test pending orders API
    const pendingResponse = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'pending' })
    });
    
    if (pendingResponse.ok) {
      const pendingText = await pendingResponse.text();
      console.log(`\n=== Pending Orders API Response ===`);
      console.log(`Response length: ${pendingText.length}`);
      console.log(`First 200 chars: ${pendingText.substring(0, 200)}`);
      
      try {
        const pendingData = JSON.parse(pendingText);
        console.log(`Total pending orders returned: ${pendingData.length}`);
        pendingData.slice(0, 5).forEach(order => {
          console.log(`ID: ${order.id}, Status: "${order.status}", Created: ${order.createdAt || order.timestamp}`);
        });
      } catch (e) {
        console.error('Failed to parse JSON:', e.message);
      }
    } else {
      console.error('Failed to fetch pending orders:', pendingResponse.status, await pendingResponse.text());
    }
    
    // Test processed orders API
    const processedResponse = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'processed' })
    });
    
    if (processedResponse.ok) {
      const processedText = await processedResponse.text();
      console.log(`\n=== Processed Orders API Response ===`);
      console.log(`Response length: ${processedText.length}`);
      console.log(`First 200 chars: ${processedText.substring(0, 200)}`);
      
      try {
        const processedData = JSON.parse(processedText);
        console.log(`Total processed orders returned: ${processedData.length}`);
        processedData.slice(0, 5).forEach(order => {
          console.log(`ID: ${order.id}, Status: "${order.status}", Created: ${order.createdAt || order.timestamp}, Processed: ${order.processedAt || 'N/A'}`);
        });
      } catch (e) {
        console.error('Failed to parse JSON:', e.message);
      }
    } else {
      console.error('Failed to fetch processed orders:', processedResponse.status, await processedResponse.text());
    }
    
  } catch (error) {
    console.error('Error testing API endpoints:', error.message);
  }
}

testApiEndpoints();