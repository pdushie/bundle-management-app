// Script to truncate order tables in the database
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const readline = require('readline');

// Create a Neon SQL client
const sql = neon(process.env.DATABASE_URL);

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function truncateOrderTables() {
  console.log('⚠️  WARNING: This script will truncate (delete) all data from the following tables:');
  console.log('   - orders');
  console.log('   - order_entries');
  console.log('\n⚠️  This action CANNOT BE UNDONE. All data will be permanently deleted.\n');
  
  return new Promise((resolve, reject) => {
    rl.question('Are you sure you want to proceed? Type "TRUNCATE" to confirm: ', async (answer) => {
      if (answer === 'TRUNCATE') {
        try {
          console.log('\nProceeding with truncation...');
          
          // Test connection
          console.log('\nTesting database connection...');
          await sql`SELECT 1`;
          console.log('✅ Database connection successful!');
          
          // Count records before truncation
          console.log('\nCounting records before truncation:');
          const initialOrders = await sql`SELECT COUNT(*) FROM orders`;
          console.log(`- Orders: ${initialOrders[0]?.count || 0}`);
          
          const initialOrderEntries = await sql`SELECT COUNT(*) FROM order_entries`;
          console.log(`- Order entries: ${initialOrderEntries[0]?.count || 0}`);
          
          // Perform truncation - order matters due to foreign key constraints
          console.log('\nTruncating order_entries table...');
          await sql`TRUNCATE TABLE order_entries CASCADE`;
          console.log('✅ Truncated order_entries table');
          
          console.log('Truncating orders table...');
          await sql`TRUNCATE TABLE orders CASCADE`;
          console.log('✅ Truncated orders table');
          
          // Verify tables are empty
          console.log('\nVerifying tables are empty:');
          const remainingOrders = await sql`SELECT COUNT(*) FROM orders`;
          console.log(`- Orders: ${remainingOrders[0]?.count || 0}`);
          
          const remainingOrderEntries = await sql`SELECT COUNT(*) FROM order_entries`;
          console.log(`- Order entries: ${remainingOrderEntries[0]?.count || 0}`);
          
          // Calculate removed counts
          const ordersRemoved = parseInt(initialOrders[0]?.count || 0);
          const orderEntriesRemoved = parseInt(initialOrderEntries[0]?.count || 0);
          
          console.log('\nSummary of removed records:');
          console.log(`- Orders: ${ordersRemoved}`);
          console.log(`- Order entries: ${orderEntriesRemoved}`);
          console.log(`- Total records removed: ${ordersRemoved + orderEntriesRemoved}`);
          
          resolve({
            success: true,
            removedRecords: {
              orders: ordersRemoved,
              orderEntries: orderEntriesRemoved,
              total: ordersRemoved + orderEntriesRemoved
            }
          });
        } catch (error) {
          console.error('❌ Error truncating tables:', error);
          reject({ success: false, error: error.message });
        } finally {
          rl.close();
        }
      } else {
        console.log('\n❌ Truncation cancelled. Your data is safe.');
        resolve({ success: false, cancelled: true });
        rl.close();
      }
    });
  });
}

// Run the truncation
truncateOrderTables()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Tables truncated successfully!');
      if (result.removedRecords.total === 0) {
        console.log('Tables were already empty.');
      }
      process.exit(0);
    } else if (result.cancelled) {
      process.exit(0);
    } else {
      console.error('\n❌ Table truncation failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Unexpected error during truncation:', error);
    process.exit(1);
  });
