// Test to verify that new bundle allocator entries capture admin info
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function testCurrentUserTracking() {
  try {
    console.log('=== Testing Current User Tracking for Bundle Allocator ===\n');
    
    // Check the most recent history entries to see if they have user_id
    const recentEntries = await sql`
      SELECT 
        he.id,
        he.date,
        he.type,
        he.user_id,
        u.name as admin_name,
        u.email as admin_email,
        COUNT(pe.id) as phone_entries_count
      FROM history_entries he
      LEFT JOIN users u ON he.user_id = u.id
      LEFT JOIN phone_entries pe ON pe.history_entry_id = he.id
      WHERE he.type = 'bundle-allocator'
      GROUP BY he.id, he.date, he.type, he.user_id, u.name, u.email
      ORDER BY he.timestamp DESC
      LIMIT 10
    `;
    
    console.log(`Found ${recentEntries.length} recent bundle allocator entries:`);
    
    if (recentEntries.length > 0) {
      console.log('\nRecent entries:');
      recentEntries.forEach((entry, index) => {
        console.log(`${index + 1}. ID: ${entry.id}`);
        console.log(`   Date: ${entry.date}`);
        console.log(`   Admin: ${entry.admin_name || 'N/A'} (${entry.admin_email || 'No email'})`);
        console.log(`   User ID: ${entry.user_id || 'NULL'}`);
        console.log(`   Phone entries: ${entry.phone_entries_count}`);
        console.log('');
      });
      
      const entriesWithAdmin = recentEntries.filter(entry => entry.user_id);
      const entriesWithoutAdmin = recentEntries.filter(entry => !entry.user_id);
      
      console.log(`\nSummary:`);
      console.log(`- Entries with admin tracking: ${entriesWithAdmin.length}`);
      console.log(`- Entries without admin tracking: ${entriesWithoutAdmin.length}`);
      
      if (entriesWithoutAdmin.length > 0) {
        console.log('\n⚠️  Some recent entries do not have admin tracking.');
        console.log('   This suggests the user tracking may not be working for new entries.');
      } else {
        console.log('\n✅ All recent entries have admin tracking!');
        console.log('   Future bundle allocator processing will automatically capture admin info.');
      }
    } else {
      console.log('\nNo recent bundle allocator entries found.');
      console.log('To test: Use the bundle allocator tool to process some phone numbers.');
    }
    
    // Also check if there are any very recent entries at all
    const anyRecentEntries = await sql`
      SELECT COUNT(*) as count
      FROM history_entries
      WHERE timestamp > ${Date.now() - (24 * 60 * 60 * 1000)}
    `;
    
    console.log(`\nEntries in last 24 hours: ${anyRecentEntries[0].count}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCurrentUserTracking();