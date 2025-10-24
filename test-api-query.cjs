require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function testApiQuery() {
  console.log('🔍 Testing the exact API query for phone entries...\n');
  
  try {
    // Replicate the exact query from the API
    const phoneEntries = await sql`
      SELECT 
        pe.id,
        pe.history_entry_id as "historyEntryId",
        pe.number,
        pe.allocation_gb as "allocationGB",
        pe.is_valid as "isValid",
        pe.is_duplicate as "isDuplicate",
        pe.created_at as "createdAt",
        u.name as "adminName",
        u.email as "adminEmail",
        he.user_id as "userId"
      FROM phone_entries pe
      LEFT JOIN history_entries he ON pe.history_entry_id = he.id
      LEFT JOIN users u ON he.user_id = u.id
      WHERE pe.number LIKE '%0249651750%'
      ORDER BY pe.created_at DESC
      LIMIT 5
    `;
    
    console.log(`Found ${phoneEntries.length} phone entries:`);
    
    for (const entry of phoneEntries) {
      console.log('\nRaw database result:');
      console.log(JSON.stringify(entry, null, 2));
      
      // Test the transformation logic
      console.log('\nTransformation result:');
      const transformed = {
        id: `phone-${entry.id}`,
        orderId: entry.historyEntryId || 'history-entry',
        number: entry.number,
        allocationGB: entry.allocationGB,
        status: entry.isValid && !entry.isDuplicate ? 'sent' : 'error',
        createdAt: entry.createdAt,
        source: 'phone_entries',
        adminInfo: entry.adminName ? {
          adminName: entry.adminName,
          adminEmail: entry.adminEmail
        } : null,
        originalEntry: entry
      };
      
      console.log(JSON.stringify(transformed, null, 2));
      console.log('-'.repeat(60));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testApiQuery().then(() => process.exit(0));