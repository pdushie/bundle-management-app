require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addOTPFields() {
  const client = await pool.connect();
  
  try {
    console.log('Adding OTP fields to users table...');
    
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS otp_secret varchar(6),
      ADD COLUMN IF NOT EXISTS otp_expires timestamp,
      ADD COLUMN IF NOT EXISTS otp_attempts integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS otp_locked_until timestamp
    `);
    
    console.log('Creating indexes...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_otp_expires ON users(otp_expires);
      CREATE INDEX IF NOT EXISTS idx_users_otp_locked ON users(otp_locked_until);
    `);
    
    console.log('OTP fields added successfully!');
    
  } catch (error) {
    console.error('Error adding OTP fields:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

addOTPFields();