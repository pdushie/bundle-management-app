// Create Schema Script for Complete Database Setup
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function createSchema() {
  console.log('Setting up database schema...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sqlFilePath = path.join(__dirname, '../migrations/complete-schema.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('Executing schema setup script...');
    await client.query(sql);

    console.log('Schema setup completed successfully.');
  } catch (error) {
    console.error('Error setting up schema:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createSchema();
