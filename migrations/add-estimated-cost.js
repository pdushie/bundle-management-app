import { db, neonClient } from '../src/lib/db';
import fs from 'fs';
import path from 'path';

// Function to run migration
async function runMigration() {
  try {
    console.log('Running migration: Adding estimated_cost column to orders table...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'add-estimated-cost.sql');
    const sqlQuery = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the SQL query directly using Neon client for DDL operations
    await neonClient`${sqlQuery}`;
    
    // Verify the column was added and populated
    const result = await neonClient`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'estimated_cost'
    `;
    
    if (result[0].count === '1') {
      console.log('Migration successful: estimated_cost column added to orders table');
      
      // Update any existing orders to populate the estimated_cost column from cost
      await neonClient`
        UPDATE orders 
        SET estimated_cost = cost 
        WHERE estimated_cost IS NULL AND cost IS NOT NULL
      `;
      
      console.log('Existing orders updated with estimated_cost values');
    } else {
      console.error('Migration failed: estimated_cost column not found after migration');
    }
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    process.exit(0);
  }
}

// Run the migration
runMigration();
