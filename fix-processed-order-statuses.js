import { db, neonClient } from './src/lib/db.js';

async function fixExistingProcessedOrderStatuses() {
  try {
    console.log('Starting to fix existing processed order entry statuses...');
    
    // Using direct SQL for maximum compatibility
    if (neonClient) {
      // Update all entries of processed orders to 'sent' status
      const result = await neonClient`
        UPDATE order_entries 
        SET status = 'sent' 
        WHERE order_id IN (
          SELECT id FROM orders WHERE status = 'processed'
        )
        AND status != 'sent'
      `;
      
      console.log(`Updated entry statuses for processed orders. Rows affected: ${result.length}`);
      
      // Get count of processed orders and their entries
      const processedOrders = await neonClient`
        SELECT COUNT(*) as count FROM orders WHERE status = 'processed'
      `;
      
      const updatedEntries = await neonClient`
        SELECT COUNT(*) as count FROM order_entries 
        WHERE order_id IN (
          SELECT id FROM orders WHERE status = 'processed'
        )
        AND status = 'sent'
      `;
      
      console.log(`Processed orders found: ${processedOrders[0]?.count || 0}`);
      console.log(`Entries with 'sent' status: ${updatedEntries[0]?.count || 0}`);
      
    } else if (db) {
      // Use Drizzle ORM if available
      const { orders, orderEntries } = await import('./src/lib/schema.js');
      const { eq, inArray } = await import('drizzle-orm');
      
      // Get all processed order IDs
      const processedOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.status, 'processed'));
      
      const processedOrderIds = processedOrders.map(order => order.id);
      
      if (processedOrderIds.length > 0) {
        // Update entries for processed orders
        await db
          .update(orderEntries)
          .set({ status: 'sent' })
          .where(inArray(orderEntries.orderId, processedOrderIds));
        
        console.log(`Updated entry statuses for ${processedOrderIds.length} processed orders`);
      } else {
        console.log('No processed orders found');
      }
    } else {
      console.error('No database connection available');
      return;
    }
    
    console.log('✅ Successfully updated existing processed order entry statuses!');
  } catch (error) {
    console.error('❌ Error updating processed order entry statuses:', error);
    throw error;
  }
}

// Run the migration
fixExistingProcessedOrderStatuses()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });