// Check and update bundle allocator entries to ensure Mayopia is set as admin
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

// Create direct Neon SQL client
const sql = neon(process.env.DATABASE_URL);

async function checkAndUpdateBundleAllocatorAdmin() {
  try {
    console.log('=== Checking Bundle Allocator Admin Attribution ===\n');
    
    // First, find Mayopia's user ID
    const mayopiaUser = await sql`
      SELECT id, name FROM users WHERE name = 'Mayopia' LIMIT 1
    `;
    
    if (mayopiaUser.length === 0) {
      console.error('Mayopia user not found in database');
      return;
    }
    
    const mayopiaId = mayopiaUser[0].id;
    console.log(`Found Mayopia user with ID: ${mayopiaId}`);
    
    // Check how many phone entries need admin attribution in total
    console.log('Checking total count of entries needing update...');
    const countResult = await sql`
      SELECT COUNT(*) as total_count
      FROM phone_entries pe
      LEFT JOIN history_entries he ON pe.history_entry_id = he.id
      WHERE he.id IS NOT NULL AND he.user_id IS NULL
    `;
    
    const totalNeedingUpdate = parseInt(countResult[0].total_count);
    console.log(`Total entries needing admin attribution: ${totalNeedingUpdate}`);
    
    if (totalNeedingUpdate === 0) {
      console.log('\n✅ All bundle allocator entries already have admin attribution');
      return;
    }
    
    console.log(`\n=== BATCH UPDATING ${totalNeedingUpdate} ENTRIES ===`);
    
    // Batch update all history entries that don't have userId set but are referenced by phone_entries
    const updateResult = await sql`
      UPDATE history_entries 
      SET user_id = ${mayopiaId}
      WHERE id IN (
        SELECT DISTINCT he.id 
        FROM history_entries he
        INNER JOIN phone_entries pe ON pe.history_entry_id = he.id
        WHERE he.user_id IS NULL
      )
    `;
    
    console.log(`✅ Batch update completed`);
    
    // Verify the update
    console.log('\n=== VERIFICATION ===');
    const verificationCount = await sql`
      SELECT COUNT(*) as count
      FROM phone_entries pe
      LEFT JOIN history_entries he ON pe.history_entry_id = he.id
      LEFT JOIN users u ON he.user_id = u.id
      WHERE u.name = 'Mayopia'
    `;
    
    const stillNeedingUpdate = await sql`
      SELECT COUNT(*) as count
      FROM phone_entries pe
      LEFT JOIN history_entries he ON pe.history_entry_id = he.id
      WHERE he.id IS NOT NULL AND he.user_id IS NULL
    `;
    
    console.log(`Entries now attributed to Mayopia: ${verificationCount[0].count}`);
    console.log(`Entries still without admin: ${stillNeedingUpdate[0].count}`);
    
    // Show some sample entries
    const sampleEntries = await sql`
      SELECT 
        pe.number as phone_number,
        u.name as admin_name
      FROM phone_entries pe
      LEFT JOIN history_entries he ON pe.history_entry_id = he.id
      LEFT JOIN users u ON he.user_id = u.id
      WHERE u.name = 'Mayopia'
      ORDER BY pe.created_at DESC
      LIMIT 5
    `;
    
    if (sampleEntries.length > 0) {
      console.log('\nSample verified entries:');
      sampleEntries.forEach(entry => {
        console.log(`  Phone: ${entry.phone_number}, Admin: ${entry.admin_name}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAndUpdateBundleAllocatorAdmin();