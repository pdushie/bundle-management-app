#!/usr/bin/env node

const { neonClient } = require('./src/lib/db');

async function testAnnouncementToggle() {
  console.log('🧪 Testing announcement toggle functionality...\n');
  
  try {
    // First, let's see what announcements exist
    console.log('📋 Fetching existing announcements...');
    const announcements = await neonClient`
      SELECT id, message, is_active, type 
      FROM announcements 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    console.log(`Found ${announcements.length} announcements:`);
    announcements.forEach(ann => {
      console.log(`  - ID: ${ann.id}, Active: ${ann.is_active}, Message: "${ann.message}"`);
    });
    
    if (announcements.length === 0) {
      console.log('\n⚠️  No announcements found. Creating a test announcement first...');
      
      // Create a test announcement
      const [newAnn] = await neonClient`
        INSERT INTO announcements (message, type, is_active, created_by)
        VALUES ('Test announcement for SSE', 'info', false, 18)
        RETURNING *
      `;
      
      console.log(`✅ Created test announcement: ID ${newAnn.id}`);
      
      // Now test toggling it
      console.log('\n🔄 Testing toggle functionality...');
      
      // Test the toggle API endpoint
      const response = await fetch('http://localhost:3000/api/admin/announcements/' + newAnn.id + '/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'next-auth.session-token=your-session-token-here' // This won't work, but we'll see the error
        }
      });
      
      console.log(`Toggle API response status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Toggle successful:', result);
      } else {
        const errorText = await response.text();
        console.log('❌ Toggle failed:', errorText);
      }
      
    } else {
      // Use the first announcement for testing
      const testAnn = announcements[0];
      console.log(`\n🔄 Testing toggle for announcement ID ${testAnn.id}...`);
      
      // Direct database toggle (simulating the API call)
      const currentTime = new Date().toISOString();
      const [updatedAnn] = await neonClient`
        UPDATE announcements 
        SET is_active = ${!testAnn.is_active}, updated_at = ${currentTime}
        WHERE id = ${testAnn.id}
        RETURNING *
      `;
      
      console.log(`✅ Direct toggle successful:`);
      console.log(`  - ID: ${updatedAnn.id}`);
      console.log(`  - Active: ${testAnn.is_active} → ${updatedAnn.is_active}`);
      console.log(`  - Message: "${updatedAnn.message}"`);
      
      // Now check if the announcement shows up in the public API
      console.log('\n🌐 Testing public API fetch...');
      const publicResponse = await fetch('http://localhost:3000/api/announcements?_=' + Date.now());
      
      if (publicResponse.ok) {
        const publicData = await publicResponse.json();
        console.log(`Public API returned ${publicData.announcements?.length || 0} active announcements:`);
        if (publicData.announcements) {
          publicData.announcements.forEach(ann => {
            console.log(`  - ID: ${ann.id}, Message: "${ann.message}"`);
          });
        }
      } else {
        console.log('❌ Public API failed:', publicResponse.status);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
  
  console.log('\n🏁 Test completed!');
}

// Run the test
testAnnouncementToggle().catch(console.error);