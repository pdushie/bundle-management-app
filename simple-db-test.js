// Simple DB test with direct query execution
const { pool } = require('@neondatabase/serverless');

// Add a timeout to let the connection establish
setTimeout(async () => {
  try {
    console.log('Setting up database connection...');
    const sql = pool(process.env.DATABASE_URL);
    
    console.log('Running test query...');
    const { rows } = await sql`SELECT COUNT(*) FROM orders WHERE status = 'pending'`;
    
    console.log('Result:', rows);
    console.log('Success!');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}, 1000);

console.log('Script started - waiting for connection...');
