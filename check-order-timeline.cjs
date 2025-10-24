// Check if the issue is with continuous new orders being added
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkOrderTimeline() {
  try {
    console.log('=== Order Timeline Analysis ===\n');
    
    // Check when orders were created vs when they were processed
    const orderTimeline = await sql`
      SELECT 
        id,
        user_name,
        status,
        total_count,
        date,
        time,
        processed_by,
        processed_at,
        CASE 
          WHEN processed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (processed_at::timestamp - (date || ' ' || time)::timestamp))/60
          ELSE NULL
        END as processing_time_minutes
      FROM orders
      WHERE date >= '2025-10-22'
      ORDER BY date DESC, time DESC
      LIMIT 20
    `;
    
    console.log('Recent order timeline (last 20 orders):');
    console.log('ID | User | Status | Entries | Created | Processed | Time to Process');
    console.log('---|------|--------|---------|---------|-----------|----------------');
    
    orderTimeline.forEach(order => {
      const shortId = order.id.substring(0, 8);
      const userName = order.user_name ? order.user_name.substring(0, 12) : 'N/A';
      const createdTime = `${order.date} ${order.time}`;
      const processedTime = order.processed_at ? 
        new Date(order.processed_at).toLocaleString() : 'Not processed';
      const processingDuration = order.processing_time_minutes ? 
        `${Math.round(order.processing_time_minutes)} min` : 'N/A';
      
      console.log(`${shortId} | ${userName} | ${order.status} | ${order.total_count} | ${createdTime} | ${processedTime} | ${processingDuration}`);
    });
    
    // Check frequency of new orders
    const orderFrequency = await sql`
      SELECT 
        date,
        COUNT(*) as orders_created,
        COUNT(CASE WHEN status = 'processed' THEN 1 END) as orders_processed
      FROM orders
      WHERE date >= '2025-10-22'
      GROUP BY date
      ORDER BY date DESC
    `;
    
    console.log('\nDaily order summary:');
    console.log('Date | Created | Processed | Pending');
    console.log('-----|---------|-----------|--------');
    
    orderFrequency.forEach(day => {
      const pending = day.orders_created - day.orders_processed;
      console.log(`${day.date} | ${day.orders_created} | ${day.orders_processed} | ${pending}`);
    });
    
    // Check if there are any stuck orders (very old pending orders)
    const stuckOrders = await sql`
      SELECT 
        id,
        user_name,
        status,
        date,
        time,
        total_count,
        AGE(NOW(), (date || ' ' || time)::timestamp) as age
      FROM orders
      WHERE status = 'pending'
      AND (date || ' ' || time)::timestamp < NOW() - INTERVAL '1 day'
      ORDER BY (date || ' ' || time)::timestamp ASC
    `;
    
    if (stuckOrders.length > 0) {
      console.log('\n🚨 Found stuck orders (pending for more than 1 day):');
      console.log('ID | User | Created | Age');
      console.log('---|------|---------|----');
      stuckOrders.forEach(order => {
        const shortId = order.id.substring(0, 8);
        const userName = order.user_name ? order.user_name.substring(0, 15) : 'N/A';
        const created = `${order.date} ${order.time}`;
        console.log(`${shortId} | ${userName} | ${created} | ${order.age}`);
      });
    } else {
      console.log('\n✅ No stuck orders found (all pending orders are recent)');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkOrderTimeline();