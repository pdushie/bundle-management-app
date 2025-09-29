// Database debugging script
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');

// Create direct Neon SQL client
const neonClient = neon(process.env.DATABASE_URL);

// Create direct SQL query function
const runQuery = async (sql) => {
  try {
    console.log(`Running SQL: ${sql}`);
    const result = await neonClient`${sql}`;
    console.log('Result:', result);
    return result;
  } catch (error) {
    console.error(`SQL Error: ${error.message}`);
    return null;
  }
};

// Run some test queries
const runTests = async () => {
  console.log('Testing database connection and queries...');
  
  // Test 1: Simple connection
  console.log('\nTest 1: Connection test');
  await runQuery('SELECT 1 AS test');
  
  // Test 2: Count with double quotes for value
  console.log('\nTest 2: Count with double quotes for value (WRONG)');
  await runQuery('SELECT COUNT(*) FROM orders WHERE status = "pending"');
  
  // Test 3: Count with single quotes for value (CORRECT)
  console.log('\nTest 3: Count with single quotes for value (CORRECT)');
  await runQuery('SELECT COUNT(*) FROM orders WHERE status = \'pending\'');
  
  // Test 4: Get actual data
  console.log('\nTest 4: Get actual order counts');
  const pendingCount = await runQuery('SELECT COUNT(*) FROM orders WHERE status = \'pending\'');
  const processedCount = await runQuery('SELECT COUNT(*) FROM orders WHERE status = \'processed\'');
  
  console.log('Order counts summary:');
  console.log('- Pending:', pendingCount?.[0]?.count || 0);
  console.log('- Processed:', processedCount?.[0]?.count || 0);
  console.log('\nTests complete.');
};

runTests().catch(console.error);
