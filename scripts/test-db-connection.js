// Simple database test
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testDatabase() {
  console.log('Testing database connection...');
  console.log('DATABASE_URL length:', process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 'undefined');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Successfully connected to database');
    
    // Try a simple query
    const result = await client.query('SELECT NOW()');
    console.log('Current database time:', result.rows[0].now);
    
    // Get all tables
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const tables = await client.query(tablesQuery);
    console.log('Tables in database:');
    tables.rows.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
    // Check user_pricing_profiles table columns
    if (tables.rows.some(table => table.table_name === 'user_pricing_profiles')) {
      const columnsQuery = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user_pricing_profiles'
      `;
      
      const columns = await client.query(columnsQuery);
      console.log('Columns in user_pricing_profiles table:');
      columns.rows.forEach(column => {
        console.log(`- ${column.column_name} (${column.data_type})`);
      });
    }

  } catch (error) {
    console.error('Error connecting to database:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

testDatabase();
