require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkProcessedEntry() {
  console.log('🔍 Checking for entry 0249651750 in processed orders...\n');
  
  try {
    // Check all entries with this number
    const entries = await sql`
      SELECT 
        oe.id,
        oe.order_id,
        oe.number,
        oe.allocation_gb,
        oe.status as entry_status,
        o.status as order_status,
        o.processed_by,
        o.processed_at,
        o.user_name,
        o.user_email
      FROM order_entries oe
      LEFT JOIN orders o ON oe.order_id = o.id
      WHERE oe.number LIKE '%0249651750%'
      ORDER BY oe.created_at DESC
    `;
    
    console.log(`Found ${entries.length} entries for 0249651750:`);
    
    for (const entry of entries) {
      console.log(`\nEntry ID: ${entry.id}`);
      console.log(`Order ID: ${entry.order_id}`);
      console.log(`Entry Status: ${entry.entry_status}`);
      console.log(`Order Status: ${entry.order_status}`);
      console.log(`Processed By: ${entry.processed_by}`);
      console.log(`Processed At: ${entry.processed_at}`);
      console.log(`User: ${entry.user_name} (${entry.user_email})`);
      
      if (entry.processed_by) {
        console.log(`\nLooking up admin for processed_by: ${entry.processed_by}`);
        const admin = await sql`
          SELECT id, name, email, role 
          FROM users 
          WHERE id = ${entry.processed_by}
        `;
        
        if (admin.length > 0) {
          console.log(`Admin: ${admin[0].name} (${admin[0].email}) - Role: ${admin[0].role}`);
        } else {
          console.log(`❌ No admin found with ID: ${entry.processed_by}`);
        }
      }
      console.log('-'.repeat(50));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkProcessedEntry().then(() => process.exit(0));