const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function debugEntry() {
  console.log('🔍 Debugging entry 0249651750...\n');
  
  try {
    // 1. Find the entry in order_entries
    console.log('1. Checking order_entries table:');
    const orderEntries = await sql`
      SELECT id, order_id, number, allocation_gb, status, created_at 
      FROM order_entries 
      WHERE number LIKE '%0249651750%'
      ORDER BY created_at DESC
    `;
    console.log('Order entries found:', orderEntries.length);
    orderEntries.forEach(entry => {
      console.log(`  - ID: ${entry.id}, OrderID: ${entry.order_id}, Status: ${entry.status}`);
    });
    
    if (orderEntries.length === 0) {
      console.log('❌ No entries found in order_entries table');
      return;
    }
    
    // 2. Check the orders table for each entry
    console.log('\n2. Checking associated orders:');
    for (const entry of orderEntries) {
      const orders = await sql`
        SELECT id, status, processed_by, processed_at, user_name, user_email
        FROM orders 
        WHERE id = ${entry.order_id}
      `;
      
      console.log(`  Order ${entry.order_id}:`);
      if (orders.length > 0) {
        const order = orders[0];
        console.log(`    - Status: ${order.status}`);
        console.log(`    - ProcessedBy: ${order.processed_by}`);
        console.log(`    - ProcessedAt: ${order.processed_at}`);
        console.log(`    - User: ${order.user_name} (${order.user_email})`);
        
        // 3. Look up admin info if processedBy exists
        if (order.processed_by) {
          console.log('\n3. Looking up admin info:');
          const admins = await sql`
            SELECT id, name, email, role 
            FROM users 
            WHERE id = ${order.processed_by}
          `;
          
          if (admins.length > 0) {
            const admin = admins[0];
            console.log(`    - Admin found: ${admin.name} (${admin.email}) - Role: ${admin.role}`);
          } else {
            console.log(`    - ❌ No admin found with ID: ${order.processed_by}`);
          }
        } else {
          console.log('    - No processedBy value set');
        }
      } else {
        console.log(`    - ❌ Order not found: ${entry.order_id}`);
      }
    }
    
    // 4. Check if there are any entries in phone_entries table
    console.log('\n4. Checking phone_entries table:');
    const phoneEntries = await sql`
      SELECT id, history_entry_id, number, allocation_gb, is_valid, is_duplicate, created_at
      FROM phone_entries 
      WHERE number LIKE '%0249651750%'
      ORDER BY created_at DESC
    `;
    console.log('Phone entries found:', phoneEntries.length);
    phoneEntries.forEach(entry => {
      console.log(`  - ID: ${entry.id}, HistoryEntryID: ${entry.history_entry_id}, Valid: ${entry.is_valid}, Duplicate: ${entry.is_duplicate}`);
    });
    
    // 5. Check history entries if phone entries exist
    if (phoneEntries.length > 0) {
      console.log('\n5. Checking associated history entries:');
      for (const phoneEntry of phoneEntries) {
        if (phoneEntry.history_entry_id) {
          const historyEntries = await sql`
            SELECT id, user_id, created_at
            FROM history_entries 
            WHERE id = ${phoneEntry.history_entry_id}
          `;
          
          if (historyEntries.length > 0) {
            const historyEntry = historyEntries[0];
            console.log(`  History Entry ${historyEntry.id}:`);
            console.log(`    - UserID: ${historyEntry.user_id}`);
            
            if (historyEntry.user_id) {
              const users = await sql`
                SELECT id, name, email, role 
                FROM users 
                WHERE id = ${historyEntry.user_id}
              `;
              
              if (users.length > 0) {
                const user = users[0];
                console.log(`    - User: ${user.name} (${user.email}) - Role: ${user.role}`);
              }
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugEntry();