// Fix schema using the same database connection as the application
import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function fixSchema() {
  console.log('Fixing database schema...');
  
  // Check if db is available
  if (!db) {
    console.error('Database connection is not available. Skipping schema fix.');
    return;
  }
  
  try {
    // Check if the column exists
    const checkResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_pricing_profiles' AND column_name = 'updated_at'
      );
    `);
    
    // Safely extract the result for Neon/Drizzle
    const columnExists = (checkResult.rows?.[0]?.exists ?? false);
    
    if (columnExists) {
      console.log('Column updated_at already exists in user_pricing_profiles table. No changes needed.');
      return;
    }

    // Add the column
    console.log('Adding updated_at column to user_pricing_profiles table...');
    await db.execute(sql`
      ALTER TABLE user_pricing_profiles 
      ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    `);
    
    console.log('Successfully added updated_at column to user_pricing_profiles table.');
  } catch (error) {
    console.error('Error fixing schema:', error);
  }
}

fixSchema();
