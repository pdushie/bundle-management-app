// Add Tiered Pricing Migration Script
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function runMigration() {
  console.log('Running migration for tiered pricing...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sqlFilePath = path.join(__dirname, '../migrations/add-tiered-pricing.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('Executing migration script...');
    await client.query(sql);

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
