const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Running migration to add order processing tracking...');
    
    // Read and execute the migration SQL
    const migrationSQL = fs.readFileSync('./migrations/add-order-processing-tracking.sql', 'utf8');
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the columns were added
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name IN ('processed_by', 'processed_at')
      ORDER BY column_name
    `);
    
    if (result.rows.length === 2) {
      console.log('✅ processed_by and processed_at columns confirmed in database');
      result.rows.forEach(row => console.log(`  - ${row.column_name}`));
    } else {
      console.log('❌ Some columns not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();