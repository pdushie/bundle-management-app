// Script to clean test data from the database
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

// Create a Neon SQL client
const sql = neon(process.env.DATABASE_URL);

async function cleanTestData() {
  console.log('Starting database test data cleanup...');

  try {
    // Test connection
    console.log('Testing database connection...');
    await sql`SELECT 1`;
    console.log('Database connection successful!');
    
    // Count records before deletion
    console.log('\nCounting records before deletion:');
    const initialOrders = await sql`SELECT COUNT(*) FROM orders`;
    console.log(`- Orders: ${initialOrders[0]?.count || 0}`);
    
    const initialOrderEntries = await sql`SELECT COUNT(*) FROM order_entries`;
    console.log(`- Order entries: ${initialOrderEntries[0]?.count || 0}`);
    
    const initialHistory = await sql`SELECT COUNT(*) FROM history_entries`;
    console.log(`- History entries: ${initialHistory[0]?.count || 0}`);
    
    const initialPhoneEntries = await sql`SELECT COUNT(*) FROM phone_entries`;
    console.log(`- Phone entries: ${initialPhoneEntries[0]?.count || 0}`);
    
    // Delete test phone entries
    console.log('\nDeleting test phone entries...');
    const deletedPhones = await sql`
      DELETE FROM phone_entries 
      WHERE 
        phone_number LIKE '+1%' OR
        phone_number LIKE '555%' OR
        phone_number LIKE '123%' OR
        phone_number LIKE '%12345%' OR
        description LIKE '%test%'
      RETURNING id, phone_number
    `;
    console.log(`Deleted ${deletedPhones.length} test phone entries`);
    if (deletedPhones.length > 0) {
      console.log('Deleted phone entries:', deletedPhones.map(p => `${p.id}: ${p.phone_number}`));
    }

    // Delete all test history entries - with enhanced criteria
    console.log('\nDeleting test history entries...');
    const deletedHistory = await sql`
      DELETE FROM history_entries 
      WHERE 
        type = 'test_entry' OR 
        id LIKE 'test-%' OR
        id LIKE 'mock-%' OR
        data::text LIKE '%test%' OR
        data::text LIKE '%mock%' OR
        user_email LIKE '%test%@%' OR
        user_email LIKE '%@example.com' OR
        timestamp < '2023-01-01'
      RETURNING id
    `;
    console.log(`Deleted ${deletedHistory.length} test history entries`);
    if (deletedHistory.length > 0) {
      console.log('Deleted history IDs:', deletedHistory.map(h => h.id));
    }
    
    // Delete test orders - with more comprehensive criteria
    console.log('\nDeleting test orders...');
    const deletedOrders = await sql`
      DELETE FROM orders 
      WHERE 
        id LIKE 'test-%' OR
        id LIKE 'mock-%' OR
        id LIKE 'order-%' OR
        id LIKE 'sample-%' OR
        user_email LIKE '%test%@%' OR
        user_email LIKE '%mock%@%' OR
        user_email LIKE '%@example.com' OR
        user_email LIKE '%@test.com' OR
        user_name LIKE '%test%' OR
        user_name IN ('John Doe', 'Jane Smith', 'Alex Johnson', 'Sam Wilson', 'Maria Garcia', 'Test User') OR
        created_at < '2023-01-01'
      RETURNING id
    `;
    console.log(`Deleted ${deletedOrders.length} test orders`);
    if (deletedOrders.length > 0) {
      console.log('Deleted order IDs:', deletedOrders.map(o => o.id));
    }
    
    // Clean orphaned order entries (entries without a parent order)
    console.log('\nCleaning orphaned order entries...');
    const deletedOrphanedEntries = await sql`
      DELETE FROM order_entries
      WHERE order_id NOT IN (SELECT id FROM orders)
      RETURNING id, order_id
    `;
    console.log(`Deleted ${deletedOrphanedEntries.length} orphaned order entries`);
    if (deletedOrphanedEntries.length > 0) {
      console.log('First 10 deleted orphaned entries:', deletedOrphanedEntries.slice(0, 10).map(e => `${e.id}: ${e.order_id}`));
    }
    
    // Count records after deletion
    console.log('\nCounting records after deletion:');
    const remainingOrders = await sql`SELECT COUNT(*) FROM orders`;
    console.log(`- Orders: ${remainingOrders[0]?.count || 0}`);
    
    const remainingOrderEntries = await sql`SELECT COUNT(*) FROM order_entries`;
    console.log(`- Order entries: ${remainingOrderEntries[0]?.count || 0}`);
    
    const remainingHistory = await sql`SELECT COUNT(*) FROM history_entries`;
    console.log(`- History entries: ${remainingHistory[0]?.count || 0}`);
    
    const remainingPhoneEntries = await sql`SELECT COUNT(*) FROM phone_entries`;
    console.log(`- Phone entries: ${remainingPhoneEntries[0]?.count || 0}`);
    
    // Calculate removed counts
    const ordersRemoved = parseInt(initialOrders[0]?.count || 0) - parseInt(remainingOrders[0]?.count || 0);
    const orderEntriesRemoved = parseInt(initialOrderEntries[0]?.count || 0) - parseInt(remainingOrderEntries[0]?.count || 0);
    const historyRemoved = parseInt(initialHistory[0]?.count || 0) - parseInt(remainingHistory[0]?.count || 0);
    const phoneEntriesRemoved = parseInt(initialPhoneEntries[0]?.count || 0) - parseInt(remainingPhoneEntries[0]?.count || 0);
    
    console.log('\nSummary of removed records:');
    console.log(`- Orders: ${ordersRemoved}`);
    console.log(`- Order entries: ${orderEntriesRemoved}`);
    console.log(`- History entries: ${historyRemoved}`);
    console.log(`- Phone entries: ${phoneEntriesRemoved}`);
    console.log(`- Total records removed: ${ordersRemoved + orderEntriesRemoved + historyRemoved + phoneEntriesRemoved}`);
    
    return {
      success: true,
      removedRecords: {
        orders: ordersRemoved,
        orderEntries: orderEntriesRemoved,
        historyEntries: historyRemoved,
        phoneEntries: phoneEntriesRemoved,
        total: ordersRemoved + orderEntriesRemoved + historyRemoved + phoneEntriesRemoved
      }
    };
  } catch (error) {
    console.error('Error cleaning test data:', error);
    return { success: false, error: error.message };
  }
}

// Run the cleanup
cleanTestData()
  .then(result => {
    if (result.success) {
      console.log('\nTest data cleanup completed successfully!');
      if (result.removedRecords.total === 0) {
        console.log('No test data was found or removed.');
      }
      process.exit(0);
    } else {
      console.error('\nTest data cleanup failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\nUnexpected error during cleanup:', error);
    process.exit(1);
  });
