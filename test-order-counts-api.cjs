// Test the order counts API to see what's being returned to frontend
// Using built-in fetch (Node.js 18+)

async function testOrderCountsAPI() {
    try {
        console.log('=== Testing Order Counts API ===\n');
        
        const response = await fetch('http://localhost:3000/api/orders/counts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        });
        
        if (!response.ok) {
            console.log('Response status:', response.status);
            const text = await response.text();
            console.log('Response text:', text.substring(0, 200));
            return;
        }
        
        const data = await response.json();
        console.log('Order counts from API:');
        console.log('- Pending count:', data.pendingCount);
        console.log('- Processed count:', data.processedCount);
        console.log('- User order count:', data.userOrderCount);
        
        console.log('\nFull API response:', JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testOrderCountsAPI();