require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkAllEntryTypes() {
  console.log('🔍 Searching for 0249651750 in all entry tables...\n');
  
  try {
    // 1. Check order_entries
    console.log('1. Checking order_entries:');
    const orderEntries = await sql`
      SELECT 
        oe.id,
        oe.order_id,
        oe.number,
        oe.allocation_gb,
        oe.status as entry_status,
        o.status as order_status,
        o.processed_by,
        o.processed_at,
        o.user_name,
        o.user_email
      FROM order_entries oe
      LEFT JOIN orders o ON oe.order_id = o.id
      WHERE oe.number LIKE '%0249651750%'
      ORDER BY oe.created_at DESC
    `;
    console.log(`Found ${orderEntries.length} entries in order_entries`);
    
    // 2. Check phone_entries
    console.log('\n2. Checking phone_entries:');
    const phoneEntries = await sql`
      SELECT 
        pe.id,
        pe.history_entry_id,
        pe.number,
        pe.allocation_gb,
        pe.is_valid,
        pe.is_duplicate,
        pe.created_at,
        he.user_id,
        he.type as history_type,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM phone_entries pe
      LEFT JOIN history_entries he ON pe.history_entry_id = he.id
      LEFT JOIN users u ON he.user_id = u.id
      WHERE pe.number LIKE '%0249651750%'
      ORDER BY pe.created_at DESC
      LIMIT 5
    `;
    console.log(`Found ${phoneEntries.length} entries in phone_entries`);
    
    for (const entry of phoneEntries) {
      console.log(`\nPhone Entry ID: ${entry.id}`);
      console.log(`History Entry ID: ${entry.history_entry_id}`);
      console.log(`Number: ${entry.number}`);
      console.log(`Allocation: ${entry.allocation_gb} GB`);
      console.log(`Valid: ${entry.is_valid}, Duplicate: ${entry.is_duplicate}`);
      console.log(`Created: ${entry.created_at}`);
      console.log(`History Type: ${entry.history_type}`);
      
      if (entry.user_name) {
        console.log(`User: ${entry.user_name} (${entry.user_email}) - Role: ${entry.user_role}`);
      } else {
        console.log(`User ID: ${entry.user_id} (no user info found)`);
      }
      console.log('-'.repeat(50));
    }
    
    // 3. Check if there are entries in either table
    if (orderEntries.length === 0 && phoneEntries.length === 0) {
      console.log('\n❌ No entries found in either table. Let me search more broadly...');
      
      // Search for similar numbers
      const similarNumbers = await sql`
        SELECT number, COUNT(*) as count, 'order_entries' as source
        FROM order_entries 
        WHERE number LIKE '%49651750%' OR number LIKE '%0249651%'
        GROUP BY number
        UNION ALL
        SELECT number, COUNT(*) as count, 'phone_entries' as source
        FROM phone_entries 
        WHERE number LIKE '%49651750%' OR number LIKE '%0249651%'
        GROUP BY number
        ORDER BY count DESC
        LIMIT 10
      `;
      
      console.log('\nSimilar numbers found:');
      for (const result of similarNumbers) {
        console.log(`${result.source}: ${result.number} (${result.count} entries)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAllEntryTypes().then(() => process.exit(0));