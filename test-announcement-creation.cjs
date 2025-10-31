#!/usr/bin/env node

// Simple test to create an announcement and test SSE broadcasting
async function testAnnouncementCreation() {
  console.log('🧪 Testing announcement creation and SSE broadcasting...\n');
  
  try {
    // First check existing announcements
    console.log('📋 Checking existing announcements...');
    const getResponse = await fetch('http://localhost:3000/api/admin/announcements', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (getResponse.ok) {
      const data = await getResponse.json();
      console.log(`Found ${data.announcements?.length || 0} existing announcements:`);
      if (data.announcements) {
        data.announcements.forEach(ann => {
          console.log(`  - ID: ${ann.id}, Active: ${ann.isActive}, Message: "${ann.message}"`);
        });
      }
    } else {
      console.log('❌ Failed to fetch existing announcements:', getResponse.status, await getResponse.text());
    }
    
    // Test creating a new announcement (this will fail without auth, but we'll see the error)
    console.log('\n📝 Testing announcement creation (will fail due to auth)...');
    const createResponse = await fetch('http://localhost:3000/api/admin/announcements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Test announcement for SSE broadcasting',
        type: 'info',
        isActive: true
      })
    });
    
    console.log(`Create API response status: ${createResponse.status}`);
    
    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log('✅ Creation successful:', result);
    } else {
      const errorText = await createResponse.text();
      console.log('❌ Creation failed (expected due to auth):', errorText);
    }
    
    // Check if there are any existing announcements we can toggle
    if (getResponse.ok) {
      const data = await getResponse.json();
      if (data.announcements && data.announcements.length > 0) {
        const firstAnn = data.announcements[0];
        console.log(`\n🔄 Testing toggle for announcement ID ${firstAnn.id} (will fail due to auth)...`);
        
        const toggleResponse = await fetch(`http://localhost:3000/api/admin/announcements/${firstAnn.id}/toggle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Toggle API response status: ${toggleResponse.status}`);
        
        if (toggleResponse.ok) {
          const result = await toggleResponse.json();
          console.log('✅ Toggle successful:', result);
        } else {
          const errorText = await toggleResponse.text();
          console.log('❌ Toggle failed (expected due to auth):', errorText);
        }
      }
    }
    
    console.log('\n💡 To properly test announcements:');
    console.log('1. Login to the admin panel in your browser');
    console.log('2. Go to /admin/announcements');
    console.log('3. Create or toggle an announcement');
    console.log('4. Watch the server console for debug messages');
    console.log('5. Check if the announcement banner updates in real-time');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
  
  console.log('\n🏁 Test completed!');
}

// Run the test
testAnnouncementCreation().catch(console.error);