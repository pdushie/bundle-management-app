// Fix missing updated_at column in user_pricing_profiles table
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixUserPricingProfilesTable() {
  console.log('Adding missing updated_at column to user_pricing_profiles table...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if column exists first to avoid errors
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_pricing_profiles' AND column_name = 'updated_at'
      );
    `;
    
    const checkResult = await client.query(checkQuery);
    const columnExists = checkResult.rows[0].exists;
    
    if (columnExists) {
      console.log('Column updated_at already exists in user_pricing_profiles table. No changes needed.');
      return;
    }

    // Add the missing column
    const alterQuery = `
      ALTER TABLE user_pricing_profiles 
      ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    `;
    
    await client.query(alterQuery);
    console.log('Successfully added updated_at column to user_pricing_profiles table.');

  } catch (error) {
    console.error('Error fixing user_pricing_profiles table:', error);
  } finally {
    await client.end();
  }
}

fixUserPricingProfilesTable();
