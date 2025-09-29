// Manual SQL test for ORDER counts
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

// Create a Neon client
const createNeonClient = () => {
  try {
    // Validate DATABASE_URL before using it
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is not defined');
      throw new Error('DATABASE_URL environment variable is not defined');
    }
    
    return neon(process.env.DATABASE_URL);
  } catch (error) {
    console.error('Failed to create Neon SQL client:', error);
    throw error;
  }
};

// Get the database client
const sql = createNeonClient();

// Run the test function
async function testOrderCounts() {
  try {
    console.log('Testing order counts with raw SQL');
    
    // Test the connection
    console.log('Testing connection...');
    const connectionTest = await sql`SELECT 1 AS test`;
    console.log('Connection test result:', connectionTest);
    
    // Get pending orders count using single quotes
    console.log('\nGetting pending orders count...');
    const pendingResult = await sql`SELECT COUNT(*) FROM orders WHERE status = 'pending'`;
    const pendingCount = parseInt(pendingResult[0]?.count || '0', 10);
    console.log('Pending orders count:', pendingCount);
    
    // Get processed orders count using single quotes
    console.log('\nGetting processed orders count...');
    const processedResult = await sql`SELECT COUNT(*) FROM orders WHERE status = 'processed'`;
    const processedCount = parseInt(processedResult[0]?.count || '0', 10);
    console.log('Processed orders count:', processedCount);
    
    console.log('\nOrder counts summary:');
    console.log('- Pending orders:', pendingCount);
    console.log('- Processed orders:', processedCount);
    console.log('- Total orders:', pendingCount + processedCount);
    
    return {
      pendingCount,
      processedCount,
      total: pendingCount + processedCount
    };
  } catch (error) {
    console.error('Error testing order counts:', error);
    return null;
  }
}

// Run the test
testOrderCounts()
  .then(result => {
    console.log('\nTest complete with result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
