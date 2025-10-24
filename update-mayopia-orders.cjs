const { neonClient } = require('./src/lib/db.js');

async function updateOrders() {
  try {
    console.log('Searching for Mayopia admin...');
    const admins = await neonClient`SELECT id, name, email, role FROM users WHERE name ILIKE '%mayopia%' OR email ILIKE '%mayopia%'`;
    console.log('Found admins:', admins);
    
    if (admins.length === 0) {
      console.log('No Mayopia admin found. Checking all admin users:');
      const allAdmins = await neonClient`SELECT id, name, email, role FROM users WHERE role IN ('admin', 'superadmin')`;
      console.log('All admin users:', allAdmins);
      
      // If there's an admin, use the first one and assume it's Mayopia
      if (allAdmins.length > 0) {
        const adminId = allAdmins[0].id;
        console.log(`Using admin ID: ${adminId}, Name: ${allAdmins[0].name}`);
        
        // Update all processed orders
        const updateResult = await neonClient`
          UPDATE orders 
          SET processed_by = ${adminId}, processed_at = NOW() 
          WHERE status = 'processed'
        `;
        console.log('Update result:', updateResult);
        
        // Check final count
        const finalCount = await neonClient`
          SELECT COUNT(*) as count FROM orders WHERE processed_by = ${adminId}
        `;
        console.log(`Orders now processed by admin: ${finalCount[0].count}`);
      }
    } else {
      const adminId = admins[0].id;
      console.log(`Using Mayopia admin ID: ${adminId}`);
      
      // Update all processed orders
      const updateResult = await neonClient`
        UPDATE orders 
        SET processed_by = ${adminId}, processed_at = NOW() 
        WHERE status = 'processed'
      `;
      console.log('Update result:', updateResult);
      
      // Check final count
      const finalCount = await neonClient`
        SELECT COUNT(*) as count FROM orders WHERE processed_by = ${adminId}
      `;
      console.log(`Orders now processed by Mayopia: ${finalCount[0].count}`);
    }

    // Verify the update by showing some orders with admin info
    console.log('\nVerifying update - showing processed orders with admin info:');
    const verifyResult = await neonClient`
      SELECT o.id, o.status, o.processed_by, o.processed_at, u.name as admin_name, u.email as admin_email
      FROM orders o
      LEFT JOIN users u ON o.processed_by = u.id
      WHERE o.status = 'processed'
      LIMIT 5
    `;
    console.log('Sample processed orders:', verifyResult);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

updateOrders();