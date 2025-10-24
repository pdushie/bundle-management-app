// Test pagination API for admin processing reports
// Using built-in fetch (Node.js 18+)

async function testPaginationAPI() {
    try {
        console.log('=== Testing Admin Processing Reports Pagination API ===\n');
        
        // Test page 1
        console.log('Testing page 1 (25 records)...');
        const response1 = await fetch('http://localhost:3000/api/admin/processing-reports?page=1&pageSize=25', {
            headers: {
                'Cookie': 'next-auth.session-token=test' // This might not work without proper auth
            }
        });
        
        if (!response1.ok) {
            console.log('Response 1 status:', response1.status);
            const text = await response1.text();
            console.log('Response 1 text:', text.substring(0, 200));
            return;
        }
        
        const data1 = await response1.json();
        console.log('Page 1 results:');
        console.log('- Records returned:', data1.reports?.length || 0);
        console.log('- Pagination info:', data1.pagination || 'Not available');
        
        if (data1.pagination && data1.pagination.totalPages > 1) {
            console.log('\nTesting page 2...');
            const response2 = await fetch('http://localhost:3000/api/admin/processing-reports?page=2&pageSize=25');
            
            if (response2.ok) {
                const data2 = await response2.json();
                console.log('Page 2 results:');
                console.log('- Records returned:', data2.reports?.length || 0);
                console.log('- Pagination info:', data2.pagination || 'Not available');
            }
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testPaginationAPI();