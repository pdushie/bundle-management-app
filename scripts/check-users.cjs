const { Pool } = require('pg');
require('dotenv').config({ path: '../.env.local' });

async function checkUsers() {
  console.log('Connecting with DB URL from env...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Checking users table...');
    const result = await pool.query('SELECT id, name, email, role FROM users ORDER BY id LIMIT 10');
    
    console.log('Found users:', result.rows.length);
    result.rows.forEach(user => {
      console.log(`User ID: ${user.id}, Name: '${user.name || 'NULL'}', Email: ${user.email}, Role: ${user.role}`);
    });
    
    // Check specific user if ID provided
    const userId = 12; // The one showing Unknown User
    console.log(`\nChecking specific user with ID ${userId}...`);
    const specificUser = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
    
    if (specificUser.rows.length === 0) {
      console.log(`No user found with ID ${userId}`);
    } else {
      const user = specificUser.rows[0];
      console.log(`User details:`);
      console.log(`- ID: ${user.id}`);
      console.log(`- Name: '${user.name || 'NULL'}'`);
      console.log(`- Name type: ${typeof user.name}`);
      console.log(`- Name length: ${user.name ? user.name.length : 0}`);
      console.log(`- Email: ${user.email}`);
      console.log(`- Role: ${user.role}`);
    }
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

checkUsers().catch(console.error);
