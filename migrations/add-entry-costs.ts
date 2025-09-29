import { db, sql } from '../lib/db';

async function addEntryCosts() {
  console.log('Adding cost field to order_entries table...');
  
  try {
    // Add cost column to order_entries table if it doesn't exist
    await sql`
      ALTER TABLE order_entries ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 2);
    `;

    // Add pricing profile columns to orders table
    await sql`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS pricing_profile_id INTEGER;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS pricing_profile_name VARCHAR(255);
    `;
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
addEntryCosts()
  .then(() => console.log('Done!'))
  .catch(console.error)
  .finally(() => process.exit());
