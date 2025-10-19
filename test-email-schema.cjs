// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Import neon directly to avoid TypeScript module issues
const { neon } = require('@neondatabase/serverless');

const neonClient = neon(process.env.DATABASE_URL);

async function testEmailSchema() {
  try {
    console.log("Testing email verification schema...");
    
    // Check if email verification columns exist
    const columns = await neonClient`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('email_verified', 'verification_token', 'verification_token_expires')
      ORDER BY column_name;
    `;
    
    console.log("Email verification columns:");
    console.table(columns);
    
    // Check if there are any users with email verification data
    const users = await neonClient`
      SELECT id, email, email_verified, 
             verification_token IS NOT NULL as has_token,
             verification_token_expires
      FROM users 
      LIMIT 5;
    `;
    
    console.log("Sample user email verification status:");
    console.table(users);
    
  } catch (error) {
    console.error("Error testing email schema:", error);
  }
}

testEmailSchema();