#!/usr/bin/env node

// Test script to verify chat notification clearing when messages are read
async function testChatNotificationClearing() {
  console.log('🧪 Testing chat notification clearing when messages are read...\n');
  
  try {
    // Step 1: Check current unread count
    console.log('📊 Step 1: Checking current unread count...');
    const unreadResponse = await fetch('http://localhost:3000/api/chat/unread');
    
    if (unreadResponse.ok) {
      const unreadData = await unreadResponse.json();
      console.log(`✅ Current unread count: ${unreadData.unreadCount || 0}`);
      
      if (unreadData.unreadCount === 0) {
        console.log('ℹ️  No unread messages. Let\'s create a test message first...');
        
        // Create a test message from user perspective
        const testMessage = {
          message: 'Test message for notification clearing - ' + new Date().toISOString()
        };
        
        console.log('📝 Creating test message...');
        const createResponse = await fetch('http://localhost:3000/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testMessage)
        });
        
        if (createResponse.ok) {
          const createData = await createResponse.json();
          console.log('✅ Test message created:', createData.message?.id);
          
          // Wait a moment for SSE broadcast
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check unread count again
          const newUnreadResponse = await fetch('http://localhost:3000/api/chat/unread');
          if (newUnreadResponse.ok) {
            const newUnreadData = await newUnreadResponse.json();
            console.log(`📈 New unread count: ${newUnreadData.unreadCount || 0}`);
          }
        } else {
          console.log('❌ Failed to create test message:', createResponse.status);
        }
      }
    } else {
      console.log('❌ Failed to check unread count:', unreadResponse.status);
    }
    
    // Step 2: Simulate admin reading messages
    console.log('\n📖 Step 2: Simulating admin reading messages...');
    console.log('Note: This requires admin authentication which we cannot simulate in this script');
    console.log('To test manually:');
    console.log('1. Open browser and log in as admin');
    console.log('2. Go to /admin/chat');
    console.log('3. Select a user with unread messages');
    console.log('4. Check if the notification badge clears in real-time');
    console.log('5. Monitor browser console for SSE "message_read" events');
    
    // Step 3: Test SSE connection
    console.log('\n📡 Step 3: Testing SSE endpoint accessibility...');
    const sseResponse = await fetch('http://localhost:3000/api/chat/events');
    console.log(`SSE endpoint status: ${sseResponse.status}`);
    if (sseResponse.status === 401) {
      console.log('✅ SSE endpoint correctly requires authentication');
    } else if (sseResponse.ok) {
      console.log('⚠️  SSE endpoint accessible without auth (might be an issue)');
    } else {
      console.log('❌ SSE endpoint error:', sseResponse.statusText);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
  
  console.log('\n🎯 Summary:');
  console.log('The chat notification clearing should work as follows:');
  console.log('1. User sends message → unread count increases');
  console.log('2. Admin opens chat for that user → messages marked as read');
  console.log('3. SSE broadcasts "message_read" event');
  console.log('4. Admin layout receives event → unread badge clears immediately');
  console.log('5. AdminChatPanel receives event → thread unread count updates');
  
  console.log('\n🏁 Test completed!');
}

// Run the test
testChatNotificationClearing().catch(console.error);