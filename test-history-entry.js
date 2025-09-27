// Test script for the history entries using direct database queries
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function testHistoryEntry() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Test connection
    console.log('Testing database connection...');
    await pool.query('SELECT 1');
    console.log('Database connection successful!');
    
    // Generate a test history entry ID
    const historyId = `test-hist-${Date.now()}`;
    
    // Insert a test history entry
    console.log('Inserting test history entry...');
    const insertResult = await pool.query(
      `INSERT INTO history_entries (
        id, date, timestamp, total_gb, valid_count, invalid_count, 
        duplicate_count, type, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        historyId,
        new Date().toISOString().split('T')[0],
        Date.now(),
        '5.00',
        10,
        2,
        1,
        'test_entry',
        1 // Use an actual user ID from your users table
      ]
    );
    
    console.log('Test history entry created:', insertResult.rows[0]);
    
    // Verify by selecting the entry back
    const selectResult = await pool.query(
      'SELECT * FROM history_entries WHERE id = $1',
      [historyId]
    );
    
    console.log('Retrieved history entry:', selectResult.rows[0]);
    
    return { success: true };
  } catch (error) {
    console.error('Test failed:', error);
    return { success: false, error };
  } finally {
    await pool.end();
  }
}

testHistoryEntry()
  .then(result => {
    if (result.success) {
      console.log('Test completed successfully!');
      process.exit(0);
    } else {
      console.error('Test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
