require('dotenv').config({ path: '.env.local' });

// Direct test of the updateOrder function to debug the database issue
async function testOrderUpdate() {
  try {
    // Import the required modules
    const { updateOrder } = require('./src/lib/orderDbOperations');
    
    console.log('=== Testing updateOrder function ===');
    
    // Test updating the specific order that was reported
    const orderId = 'order-1761721043752';
    const updates = {
      status: 'processed',
      processedBy: 1,
      processedAt: new Date().toISOString()
    };
    
    console.log(`Testing update for order: ${orderId}`);
    console.log('Updates to apply:', updates);
    
    await updateOrder(orderId, updates);
    
    console.log('Update completed successfully!');
    
  } catch (error) {
    console.error('Error testing order update:', error);
  }
  
  process.exit(0);
}

testOrderUpdate();