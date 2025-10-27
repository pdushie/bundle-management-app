const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testChatPermissionCheck() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Test the exact same query used in the chat page
    const userId = 18; // standard_admin user
    
    console.log(`Testing chat permission check for user ID: ${userId}`);
    
    const result = await pool.query(`
      SELECT p.name 
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = $1 AND p.name = 'admin.chat' AND ur.is_active = true
    `, [userId]);
    
    console.log('Query result:', result.rows);
    console.log('Result rows length:', result.rows.length);
    console.log('Has permission:', result.rows.length > 0);
    
    // Also check if user has any active roles
    const userRoles = await pool.query(`
      SELECT r.name as role_name, ur.is_active
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1
      ORDER BY ur.is_active DESC, r.name
    `, [userId]);
    
    console.log('\nUser roles:');
    userRoles.rows.forEach(role => {
      console.log(`- ${role.role_name} (active: ${role.is_active})`);
    });
    
    // Check if standard_admin role has the permission
    const rolePermission = await pool.query(`
      SELECT r.name as role_name, p.name as permission_name
      FROM roles r
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE r.name = 'standard_admin' AND p.name = 'admin.chat'
    `);
    
    console.log('\nRole permission check:');
    console.log(rolePermission.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testChatPermissionCheck();