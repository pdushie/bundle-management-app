#!/usr/bin/env node

// Simple test to check announcement functionality and SSE broadcasting
async function testAnnouncementToggle() {
  console.log('🧪 Testing announcement toggle functionality...\n');
  
  try {
    // Test the public announcements API endpoint
    console.log('🌐 Testing public announcements API...');
    const publicResponse = await fetch('http://localhost:3000/api/announcements?_=' + Date.now());
    
    if (publicResponse.ok) {
      const publicData = await publicResponse.json();
      console.log(`✅ Public API returned ${publicData.announcements?.length || 0} active announcements:`);
      if (publicData.announcements && publicData.announcements.length > 0) {
        publicData.announcements.forEach(ann => {
          console.log(`  - ID: ${ann.id}, Active: ${ann.isActive}, Message: "${ann.message}"`);
        });
      } else {
        console.log('  (No active announcements)');
      }
    } else {
      console.log('❌ Public API failed:', publicResponse.status, await publicResponse.text());
    }
    
    // Test SSE connection
    console.log('\n📡 Testing SSE announcement connection...');
    
    // Create a simple SSE test
    const testSSE = () => {
      return new Promise((resolve) => {
        const eventSource = new EventSource('http://localhost:3000/api/announcements/events');
        let messageCount = 0;
        
        eventSource.onopen = () => {
          console.log('✅ SSE connection opened');
        };
        
        eventSource.onmessage = (event) => {
          messageCount++;
          console.log(`📨 SSE message ${messageCount}:`, event.data);
          
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'connected') {
              console.log('✅ SSE connection confirmed');
            } else if (data.type === 'heartbeat') {
              console.log('💓 Heartbeat received');
            } else if (data.type === 'announcement_created' || data.type === 'announcement_updated') {
              console.log('🎯 Announcement update received!', data);
            }
          } catch (e) {
            console.log('📝 Raw SSE data:', event.data);
          }
          
          // Close after 5 messages or 10 seconds
          if (messageCount >= 5) {
            eventSource.close();
            resolve(true);
          }
        };
        
        eventSource.onerror = (error) => {
          console.log('❌ SSE error:', error);
          eventSource.close();
          resolve(false);
        };
        
        // Timeout after 10 seconds
        setTimeout(() => {
          eventSource.close();
          console.log('⏰ SSE test timeout');
          resolve(messageCount > 0);
        }, 10000);
      });
    };
    
    // Note: EventSource is not available in Node.js environment
    console.log('ℹ️  SSE test requires browser environment - check browser console for SSE events');
    
    console.log('\n💡 To test real-time announcements:');
    console.log('1. Open browser developer console');
    console.log('2. Go to the admin announcements page');
    console.log('3. Toggle an announcement active/inactive');
    console.log('4. Check if AnnouncementBanner updates immediately');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
  
  console.log('\n🏁 Test completed!');
}

// Run the test
testAnnouncementToggle().catch(console.error);