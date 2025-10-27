const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkUserPermissions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Get standard_admin users
    const users = await pool.query(`
      SELECT u.id, u.email, u.role
      FROM users u
      WHERE u.role = 'standard_admin' AND u.status = 'approved' AND u.is_active = true
      LIMIT 3
    `);
    
    console.log('Standard Admin Users:');
    console.log('='.repeat(50));
    
    for (const user of users.rows) {
      console.log(`\n👤 ${user.email} (ID: ${user.id})`);
      
      // Check RBAC permissions for this user
      const rbacPermissions = await pool.query(`
        SELECT p.name, p.display_name
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON ur.role_id = rp.role_id
        WHERE ur.user_id = $1 AND ur.is_active = true
        ORDER BY p.name
      `, [user.id]);
      
      console.log(`📋 RBAC Permissions (${rbacPermissions.rows.length}):`);
      rbacPermissions.rows.forEach(perm => {
        const emoji = perm.name === 'admin.chat' ? '💬' : '📄';
        console.log(`   ${emoji} ${perm.name}`);
      });
      
      const hasChatPermission = rbacPermissions.rows.some(p => p.name === 'admin.chat');
      console.log(`\n✅ Has admin.chat permission: ${hasChatPermission}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkUserPermissions();