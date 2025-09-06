const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function createAdmin() {
  const client = await pool.connect();
  
  try {
    const email = 'admin@example.com';
    const password = 'admin123456';
    const name = 'System Administrator';
    
    // Check if admin already exists
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      console.log('Admin user already exists');
      return;
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = `admin_${Date.now()}`;
    
    await client.query(
      `INSERT INTO users (id, name, email, hashed_password, role, status, approved_at) 
       VALUES ($1, $2, $3, $4, 'admin', 'approved', NOW())`,
      [userId, name, email, hashedPassword]
    );
    
    console.log('Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Please change the password after first login.');
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createAdmin();
