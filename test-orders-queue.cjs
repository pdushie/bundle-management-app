// Test orders queue issue - check pending vs processed orders
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkOrdersQueue() {
  try {
    console.log('=== Checking Orders Queue Issue ===\n');
    
    // Check current order counts by status
    const orderCounts = await sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders
      GROUP BY status
      ORDER BY status
    `;
    
    console.log('Order counts by status:');
    orderCounts.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });
    
    // Check recent orders (last 10)
    const recentOrders = await sql`
      SELECT 
        id,
        user_name,
        status,
        total_count,
        total_data,
        date,
        time,
        processed_by,
        processed_at
      FROM orders
      ORDER BY timestamp DESC
      LIMIT 10
    `;
    
    console.log('\nRecent 10 orders:');
    console.log('ID | User | Status | Entries | Date | Time | Processed By');
    console.log('---|------|--------|---------|------|------|-------------');
    recentOrders.forEach(order => {
      const shortId = order.id.substring(0, 8);
      const userName = order.user_name ? order.user_name.substring(0, 15) : 'N/A';
      console.log(`${shortId} | ${userName} | ${order.status} | ${order.total_count} | ${order.date} | ${order.time} | ${order.processed_by || 'NULL'}`);
    });
    
    // Check if there are any orders that should be processed but aren't
    const shouldBeProcessed = await sql`
      SELECT 
        o.id,
        o.user_name,
        o.status,
        o.total_count,
        COUNT(oe.id) as entry_count,
        COUNT(CASE WHEN oe.status = 'sent' THEN 1 END) as sent_entries,
        COUNT(CASE WHEN oe.status = 'pending' THEN 1 END) as pending_entries
      FROM orders o
      LEFT JOIN order_entries oe ON o.id = oe.order_id
      WHERE o.status = 'pending'
      GROUP BY o.id, o.user_name, o.status, o.total_count
      HAVING COUNT(CASE WHEN oe.status = 'sent' THEN 1 END) > 0
      LIMIT 5
    `;
    
    if (shouldBeProcessed.length > 0) {
      console.log('\n⚠️  Orders with "pending" status but have "sent" entries:');
      console.log('ID | User | Status | Total | Sent | Pending');
      console.log('---|------|--------|-------|------|--------');
      shouldBeProcessed.forEach(order => {
        const shortId = order.id.substring(0, 8);
        const userName = order.user_name ? order.user_name.substring(0, 15) : 'N/A';
        console.log(`${shortId} | ${userName} | ${order.status} | ${order.total_count} | ${order.sent_entries} | ${order.pending_entries}`);
      });
    }
    
    // Check if there are orders with incorrect status
    const statusMismatch = await sql`
      SELECT 
        o.id,
        o.user_name,
        o.status as order_status,
        o.total_count,
        COUNT(oe.id) as entry_count,
        COUNT(CASE WHEN oe.status = 'sent' THEN 1 END) as sent_entries,
        COUNT(CASE WHEN oe.status = 'pending' THEN 1 END) as pending_entries,
        COUNT(CASE WHEN oe.status = 'error' THEN 1 END) as error_entries
      FROM orders o
      LEFT JOIN order_entries oe ON o.id = oe.order_id
      GROUP BY o.id, o.user_name, o.status, o.total_count
      HAVING (
        (o.status = 'pending' AND COUNT(CASE WHEN oe.status = 'sent' THEN 1 END) = COUNT(oe.id)) OR
        (o.status = 'processed' AND COUNT(CASE WHEN oe.status = 'pending' THEN 1 END) > 0)
      )
      LIMIT 10
    `;
    
    if (statusMismatch.length > 0) {
      console.log('\n🔍 Orders with status mismatches:');
      console.log('ID | User | Order Status | Entries | Sent | Pending | Error');
      console.log('---|------|--------------|---------|------|---------|------');
      statusMismatch.forEach(order => {
        const shortId = order.id.substring(0, 8);
        const userName = order.user_name ? order.user_name.substring(0, 12) : 'N/A';
        console.log(`${shortId} | ${userName} | ${order.order_status} | ${order.entry_count} | ${order.sent_entries} | ${order.pending_entries} | ${order.error_entries}`);
      });
    } else {
      console.log('\n✅ No obvious status mismatches found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkOrdersQueue();