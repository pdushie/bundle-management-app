// Test script to verify message read functionality
const test = async () => {
  console.log('🧪 Testing message read functionality...\n');
  
  try {
    // 1. Send a chat message first (as user)
    console.log('1. Sending a test message...');
    const sendResponse = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'next-auth.session-token=your-session-token-here' // Replace with actual token
      },
      body: JSON.stringify({
        message: 'Test message for read notification'
      })
    });
    
    if (sendResponse.ok) {
      const sendResult = await sendResponse.json();
      console.log('✅ Message sent:', sendResult.message.message);
      console.log('   Message ID:', sendResult.message.id);
      console.log('   Read status:', sendResult.message.read);
    } else {
      console.log('❌ Failed to send message:', sendResponse.status);
      return;
    }
    
    console.log('\n2. Checking unread count...');
    // 2. Check unread count (this will be 401 without proper auth, but that's expected)
    const unreadResponse = await fetch('http://localhost:3000/api/chat/unread');
    console.log('   Unread endpoint status:', unreadResponse.status);
    
    console.log('\n3. Reading messages (this should mark them as read)...');
    // 3. Read messages (as admin) - this should trigger message_read broadcast
    const readResponse = await fetch('http://localhost:3000/api/chat?userId=19', {
      headers: {
        'Cookie': 'next-auth.session-token=admin-session-token-here' // Replace with admin token
      }
    });
    
    if (readResponse.ok) {
      const readResult = await readResponse.json();
      console.log('✅ Messages read. Count:', readResult.messages?.length || 0);
      console.log('   Last message read status should be true now');
    } else {
      console.log('❌ Failed to read messages:', readResponse.status);
    }
    
    console.log('\n4. Expected behavior:');
    console.log('   - Messages should be marked as read in database');
    console.log('   - SSE broadcast should show "message_read" event in server logs');
    console.log('   - Unread count should decrease in real-time for connected clients');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

test();