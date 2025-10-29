import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function debugOrderStatus() {
  try {
    console.log('=== Checking order status distribution ===');
    
    // Check all orders and their statuses
    const allOrders = await sql`
      SELECT id, status, created_at, processed_at, 
             CASE 
               WHEN processed_at IS NOT NULL THEN 'has_processed_at'
               ELSE 'no_processed_at'
             END as processed_at_status
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 20
    `;
    
    console.log('\n=== Recent 20 orders ===');
    allOrders.forEach(order => {
      console.log(`ID: ${order.id}, Status: "${order.status}", Created: ${order.created_at}, Processed: ${order.processed_at}, ProcessedAt: ${order.processed_at_status}`);
    });
    
    // Check status distribution
    const statusCounts = await sql`
      SELECT status, COUNT(*) as count
      FROM orders 
      GROUP BY status
      ORDER BY status
    `;
    
    console.log('\n=== Status Distribution ===');
    statusCounts.forEach(row => {
      console.log(`Status: "${row.status}" - Count: ${row.count}`);
    });
    
    // Check for orders with processed_at but status still pending
    const inconsistentOrders = await sql`
      SELECT id, status, created_at, processed_at
      FROM orders 
      WHERE processed_at IS NOT NULL AND status != 'processed'
      ORDER BY processed_at DESC
      LIMIT 10
    `;
    
    console.log('\n=== Inconsistent Orders (have processed_at but status != processed) ===');
    if (inconsistentOrders.length > 0) {
      inconsistentOrders.forEach(order => {
        console.log(`ID: ${order.id}, Status: "${order.status}", Processed At: ${order.processed_at}`);
      });
    } else {
      console.log('No inconsistent orders found');
    }
    
    // Check for orders with status processed but no processed_at
    const missingProcessedAt = await sql`
      SELECT id, status, created_at, processed_at
      FROM orders 
      WHERE status = 'processed' AND processed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    console.log('\n=== Orders with status=processed but no processed_at ===');
    if (missingProcessedAt.length > 0) {
      missingProcessedAt.forEach(order => {
        console.log(`ID: ${order.id}, Status: "${order.status}", Created: ${order.created_at}`);
      });
    } else {
      console.log('No orders with missing processed_at found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugOrderStatus();