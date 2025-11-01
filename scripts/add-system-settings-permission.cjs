const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

// Database connection using Neon
const sql = neon(process.env.DATABASE_URL);

async function addSystemSettingsPermission() {
  try {
    console.log('🔧 Adding System Settings Permission to RBAC...\n');

    // 1. Add the system settings permission if it doesn't exist
    console.log('📝 Adding system:settings permission...');
    const permissionResult = await sql`
      INSERT INTO permissions (name, display_name, description, resource, action, is_active)
      VALUES ('system:settings', 'System Settings', 'Access and modify system settings and configuration', 'system', 'settings', true)
      ON CONFLICT (name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        resource = EXCLUDED.resource,
        action = EXCLUDED.action
      RETURNING id, name
    `;
    console.log(`   ✅ Permission created/updated: ${permissionResult[0].name}`);

    // 2. Assign the permission to standard_admin role
    console.log('\n👤 Assigning permission to standard_admin role...');
    
    // Get the standard_admin role ID
    const roleResult = await sql`
      SELECT id FROM roles WHERE name = 'standard_admin'
    `;
    
    if (roleResult.length === 0) {
      console.log('   ❌ standard_admin role not found!');
      return;
    }

    const standardAdminRoleId = roleResult[0].id;
    const permissionId = permissionResult[0].id;

    // Assign the permission to standard_admin
    await sql`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
      VALUES (${standardAdminRoleId}, ${permissionId}, NOW(), NULL)
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `;
    console.log('   ✅ system:settings permission assigned to standard_admin');

    // 3. Also assign to admin and super_admin roles
    console.log('\n👑 Assigning permission to admin and super_admin roles...');
    
    const adminRoles = await sql`
      SELECT id, name FROM roles WHERE name IN ('admin', 'super_admin')
    `;

    for (const role of adminRoles) {
      await sql`
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES (${role.id}, ${permissionId}, NOW(), NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `;
      console.log(`   ✅ system:settings permission assigned to ${role.name}`);
    }

    // 4. Verify the assignments
    console.log('\n🔍 Verifying permission assignments...');
    const verifyResult = await sql`
      SELECT r.name as role_name, p.name as permission_name, p.description
      FROM roles r
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE p.name = 'system:settings'
      ORDER BY r.name
    `;

    console.log('📋 Roles with system:settings permission:');
    for (const row of verifyResult) {
      console.log(`   🔑 ${row.role_name}: ${row.permission_name} - ${row.description}`);
    }

    // 5. Show which users now have access
    console.log('\n👥 Users who now have system:settings access:');
    const usersResult = await sql`
      SELECT DISTINCT u.email, u.role as legacy_role, r.name as rbac_role
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE p.name = 'system:settings' AND ur.is_active = true
      ORDER BY r.name, u.email
    `;

    if (usersResult.length > 0) {
      for (const user of usersResult) {
        const emoji = user.rbac_role === 'super_admin' ? '👑' : 
                     user.rbac_role === 'admin' ? '👨‍💼' : 
                     user.rbac_role === 'standard_admin' ? '🔧' : '👤';
        console.log(`   ${emoji} ${user.email} (${user.rbac_role})`);
      }
    } else {
      console.log('   ⚠️ No users found with system:settings permission');
    }

    console.log('\n✅ System Settings permission successfully added to RBAC!');
    console.log('\n💡 What this enables:');
    console.log('   • standard_admin users can now access System Settings');
    console.log('   • They can halt/resume order processing');
    console.log('   • They can update order halt messages');
    console.log('   • Access is controlled via RBAC permissions');

  } catch (error) {
    console.error('❌ Error adding system settings permission:', error);
    throw error;
  }
}

// Run the script
addSystemSettingsPermission().catch(console.error);