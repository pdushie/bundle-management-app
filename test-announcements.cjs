require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function testAnnouncementsAPI() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    console.log('Testing announcements system...\n');
    
    // Check if announcements table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'announcements'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Announcements table does not exist');
      return;
    }
    
    console.log('✅ Announcements table exists');
    
    // Check current announcements
    const result = await client.query(`
      SELECT id, message, type, is_active, start_date, end_date, created_at
      FROM announcements 
      ORDER BY created_at DESC
    `);
    
    console.log(`\n📊 Total announcements: ${result.rows.length}`);
    
    if (result.rows.length === 0) {
      console.log('\n🔸 No announcements found. Creating a test announcement...');
      
      // Create a test announcement
      await client.query(`
        INSERT INTO announcements (message, type, is_active, created_by)
        VALUES ($1, $2, $3, $4)
      `, [
        'Welcome to the Bundle Management System! This is a test announcement.',
        'info',
        true,
        1 // Assuming user ID 1 exists
      ]);
      
      console.log('✅ Test announcement created');
    } else {
      console.log('\n📋 Current announcements:');
      result.rows.forEach((row, index) => {
        console.log(`\n${index + 1}. [${row.type.toUpperCase()}] ${row.message}`);
        console.log(`   Active: ${row.is_active ? '✅' : '❌'}`);
        console.log(`   Created: ${new Date(row.created_at).toLocaleString()}`);
        if (row.start_date) console.log(`   Start: ${new Date(row.start_date).toLocaleString()}`);
        if (row.end_date) console.log(`   End: ${new Date(row.end_date).toLocaleString()}`);
      });
      
      const activeCount = result.rows.filter(row => row.is_active).length;
      console.log(`\n🔥 Active announcements: ${activeCount}`);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testAnnouncementsAPI();