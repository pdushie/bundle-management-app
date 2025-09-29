// Apply the add-order-costs migration
const { db } = require('../src/lib/db');
const { sql } = require('drizzle-orm');
const fs = require('fs');
const path = require('path');

function applyMigration() {
  try {
    console.log('Starting migration to add cost column to orders table...');
    
    // Read the SQL migration file
    const migrationFile = path.join(process.cwd(), 'migrations', 'add-order-costs.sql');
    const migrationSql = fs.readFileSync(migrationFile, 'utf8');
    
    // Execute the SQL directly
    db.execute(sql.raw(migrationSql))
      .then(() => {
        console.log('Successfully added cost column to orders table');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
