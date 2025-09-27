// Script to check table structure for both users and history_entries tables
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkTableStructure() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Checking users table structure...');
    const usersResult = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('users table columns:');
    console.table(usersResult.rows);
    
    console.log('\nChecking history_entries table structure...');
    const historyResult = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'history_entries'
      ORDER BY ordinal_position;
    `);
    
    console.log('history_entries table columns:');
    console.table(historyResult.rows);
    
    // Check primary key constraint for users table
    const usersPkResult = await pool.query(`
      SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = 'users'::regclass AND i.indisprimary;
    `);
    
    console.log('\nPrimary key for users table:');
    console.table(usersPkResult.rows);
    
  } catch (error) {
    console.error('Error checking schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkTableStructure().catch(console.error);
