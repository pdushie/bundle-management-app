// Use built-in fetch (Node.js 18+)

async function testTrackAPI() {
    try {
        console.log('Testing track orders filter API...');
        
        const response = await fetch('http://localhost:3000/api/orders/track/filter?processedBy=all');
        
        if (!response.ok) {
            console.error('API Error:', response.status, response.statusText);
            const text = await response.text();
            console.error('Response:', text);
            return;
        }
        
        const data = await response.json();
        console.log('\n=== API Response ===');
        console.log('Total orders:', data.orders?.length || 0);
        
        if (data.orders && data.orders.length > 0) {
            console.log('\n=== Sample Orders ===');
            
            // Show a few examples of each type
            const orderEntries = data.orders.filter(o => o.orderType !== 'bundle_allocator');
            const bundleEntries = data.orders.filter(o => o.orderType === 'bundle_allocator');
            
            console.log('\nOrder Entries:', orderEntries.length);
            if (orderEntries.length > 0) {
                console.log('Sample order entry:', {
                    id: orderEntries[0].id,
                    phoneNumber: orderEntries[0].phoneNumber,
                    processedBy: orderEntries[0].processedBy,
                    orderType: orderEntries[0].orderType
                });
            }
            
            console.log('\nBundle Allocator Entries:', bundleEntries.length);
            if (bundleEntries.length > 0) {
                console.log('Sample bundle entry:', {
                    id: bundleEntries[0].id,
                    phoneNumber: bundleEntries[0].phoneNumber,
                    processedBy: bundleEntries[0].processedBy,
                    orderType: bundleEntries[0].orderType
                });
            }
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testTrackAPI();