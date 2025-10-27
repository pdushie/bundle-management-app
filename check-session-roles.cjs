const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkSessionRoleMapping() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Get standard_admin users and their current role
    const users = await pool.query(`
      SELECT u.id, u.email, u.role as legacy_role, u.status, u.is_active
      FROM users u
      WHERE u.role = 'standard_admin' AND u.status = 'approved' AND u.is_active = true
      LIMIT 2
    `);
    
    console.log('Standard Admin Users:');
    console.log('='.repeat(50));
    
    for (const user of users.rows) {
      console.log(`\n👤 ${user.email} (ID: ${user.id})`);
      console.log(`   Legacy Role: ${user.legacy_role}`);
      console.log(`   Status: ${user.status}, Active: ${user.is_active}`);
      
      // Check what the getPrimaryRole function would return
      const rbacRoles = await pool.query(`
        SELECT r.name as role_name, ur.is_active
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
        ORDER BY ur.is_active DESC, r.name
      `, [user.id]);
      
      console.log(`   RBAC Roles:`);
      rbacRoles.rows.forEach(role => {
        console.log(`     - ${role.role_name} (active: ${role.is_active})`);
      });
      
      // Simulate the primary role selection logic
      const activeRoles = rbacRoles.rows.filter(r => r.is_active).map(r => r.role_name);
      let primaryRole = 'user'; // default
      
      if (activeRoles.includes('super_admin')) primaryRole = 'super_admin';
      else if (activeRoles.includes('admin')) primaryRole = 'admin';
      else if (activeRoles.includes('standard_admin')) primaryRole = 'standard_admin';
      else if (activeRoles.includes('data_processor')) primaryRole = 'data_processor';
      else if (activeRoles.includes('moderator')) primaryRole = 'moderator';
      else if (activeRoles.includes('user')) primaryRole = 'user';
      else if (activeRoles.includes('viewer')) primaryRole = 'viewer';
      else primaryRole = user.legacy_role; // fallback
      
      console.log(`   Primary Role (computed): ${primaryRole}`);
      
      // Check chat permission
      const chatPermission = await pool.query(`
        SELECT COUNT(*) as count
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = $1 AND p.name = 'admin.chat' AND ur.is_active = true
      `, [user.id]);
      
      console.log(`   Has admin.chat permission: ${chatPermission.rows[0].count > 0}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkSessionRoleMapping();