// Script to check database structure directly
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkDbSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Checking history_entries table structure...');
    const result = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'history_entries'
      ORDER BY ordinal_position;
    `);
    
    console.log('history_entries table columns:');
    console.table(result.rows);
    
    // Check if user_id column exists
    const userIdColumn = result.rows.find(row => row.column_name === 'user_id');
    if (userIdColumn) {
      console.log('user_id column exists with data type:', userIdColumn.data_type);
    } else {
      console.log('WARNING: user_id column does not exist in history_entries table');
    }
    
    // Check for any columns with similar names
    const similarColumns = result.rows.filter(row => 
      row.column_name.includes('user') || 
      row.column_name.includes('id')
    );
    
    if (similarColumns.length > 0) {
      console.log('Found columns with similar names:');
      console.table(similarColumns);
    }
    
  } catch (error) {
    console.error('Error checking schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkDbSchema().catch(console.error);
