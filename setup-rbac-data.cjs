const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function setupRBACData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Setting up RBAC data for standard_admin users...\n');

    // 1. First, ensure all required roles exist
    console.log('1. Ensuring required roles exist...');
    
    const requiredRoles = [
      { name: 'super_admin', displayName: 'Super Administrator', description: 'Full system access with all permissions' },
      { name: 'admin', displayName: 'Administrator', description: 'Administrative access with most permissions' },
      { name: 'standard_admin', displayName: 'Standard Administrator', description: 'Standard administrative access with selected permissions' },
      { name: 'user', displayName: 'User', description: 'Standard user access' },
      { name: 'viewer', displayName: 'Viewer', description: 'Read-only access' }
    ];

    for (const role of requiredRoles) {
      const existingRole = await pool.query('SELECT id FROM roles WHERE name = $1', [role.name]);
      
      if (existingRole.rows.length === 0) {
        await pool.query(`
          INSERT INTO roles (name, display_name, description, is_active, is_system_role, created_at)
          VALUES ($1, $2, $3, true, true, NOW())
        `, [role.name, role.displayName, role.description]);
        console.log(`   ✅ Created role: ${role.name}`);
      } else {
        console.log(`   ➡️ Role already exists: ${role.name}`);
      }
    }

    // 2. Ensure all required permissions exist
    console.log('\n2. Ensuring required permissions exist...');
    
    const requiredPermissions = [
      // User management permissions
      { name: 'users:view', displayName: 'View Users', description: 'View user accounts and profiles', resource: 'users', action: 'view' },
      { name: 'users:create', displayName: 'Create Users', description: 'Create new user accounts', resource: 'users', action: 'create' },
      { name: 'users:update', displayName: 'Update Users', description: 'Update user accounts and profiles', resource: 'users', action: 'update' },
      { name: 'users:delete', displayName: 'Delete Users', description: 'Delete user accounts', resource: 'users', action: 'delete' },
      
      // Pricing management permissions
      { name: 'pricing:view', displayName: 'View Pricing', description: 'View pricing profiles and configurations', resource: 'pricing', action: 'view' },
      { name: 'pricing:create', displayName: 'Create Pricing', description: 'Create new pricing profiles', resource: 'pricing', action: 'create' },
      { name: 'pricing:update', displayName: 'Update Pricing', description: 'Update pricing profiles and configurations', resource: 'pricing', action: 'update' },
      { name: 'pricing:delete', displayName: 'Delete Pricing', description: 'Delete pricing profiles', resource: 'pricing', action: 'delete' },
      
      // Admin-specific permissions
      { name: 'admin:announcements', displayName: 'Manage Announcements', description: 'Create and manage system announcements', resource: 'admin', action: 'announcements' },
      { name: 'admin:chat', displayName: 'Manage Chat Support', description: 'Handle user chat support requests', resource: 'admin', action: 'chat' },
      { name: 'admin:minimum_entries', displayName: 'Manage Minimum Entries', description: 'Set minimum order entry requirements for users', resource: 'admin', action: 'minimum_entries' },
      { name: 'admin:orders', displayName: 'View Order Reports', description: 'Access order reports and analytics', resource: 'admin', action: 'orders' },
      
      // RBAC management permissions
      { name: 'rbac:view', displayName: 'View RBAC', description: 'View roles and permissions configuration', resource: 'rbac', action: 'view' },
      { name: 'rbac:create', displayName: 'Create RBAC', description: 'Create new roles and permissions', resource: 'rbac', action: 'create' },
      { name: 'rbac:update', displayName: 'Update RBAC', description: 'Update roles and permissions configuration', resource: 'rbac', action: 'update' },
      { name: 'rbac:delete', displayName: 'Delete RBAC', description: 'Delete roles and permissions', resource: 'rbac', action: 'delete' },
      { name: 'rbac:roles:view', displayName: 'View Roles', description: 'View role configurations', resource: 'rbac_roles', action: 'view' },
      { name: 'rbac:roles:create', displayName: 'Create Roles', description: 'Create new roles', resource: 'rbac_roles', action: 'create' },
      { name: 'rbac:roles:update', displayName: 'Update Roles', description: 'Update role configurations', resource: 'rbac_roles', action: 'update' },
      { name: 'rbac:roles:delete', displayName: 'Delete Roles', description: 'Delete roles', resource: 'rbac_roles', action: 'delete' }
    ];

    for (const permission of requiredPermissions) {
      const existingPermission = await pool.query('SELECT id FROM permissions WHERE name = $1', [permission.name]);
      
      if (existingPermission.rows.length === 0) {
        await pool.query(`
          INSERT INTO permissions (name, display_name, description, resource, action, is_active, created_at)
          VALUES ($1, $2, $3, $4, $5, true, NOW())
        `, [permission.name, permission.displayName, permission.description, permission.resource, permission.action]);
        console.log(`   ✅ Created permission: ${permission.name}`);
      } else {
        console.log(`   ➡️ Permission already exists: ${permission.name}`);
      }
    }

    // 3. Set up role permissions
    console.log('\n3. Setting up role permissions...');

    // Super admin gets all permissions
    const superAdminRole = await pool.query('SELECT id FROM roles WHERE name = $1', ['super_admin']);
    const allPermissions = await pool.query('SELECT id FROM permissions WHERE is_active = true');
    
    if (superAdminRole.rows.length > 0) {
      const superAdminRoleId = superAdminRole.rows[0].id;
      
      for (const permission of allPermissions.rows) {
        const existingRolePermission = await pool.query(
          'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
          [superAdminRoleId, permission.id]
        );
        
        if (existingRolePermission.rows.length === 0) {
          await pool.query(`
            INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
            VALUES ($1, $2, NOW(), NULL)
          `, [superAdminRoleId, permission.id]);
        }
      }
      console.log(`   ✅ Assigned all permissions to super_admin role`);
    }

    // Standard admin gets specific permissions (configurable set)
    const standardAdminRole = await pool.query('SELECT id FROM roles WHERE name = $1', ['standard_admin']);
    const standardAdminPermissions = [
      'users:view', 'users:create', 'users:update', // User management
      'pricing:view', 'pricing:create', 'pricing:update', // Pricing management  
      'admin:minimum_entries', // Minimum entries management
      'admin:orders' // Order reports
      // NOTE: Intentionally excluding 'admin:chat' and 'admin:announcements' to test RBAC
    ];

    if (standardAdminRole.rows.length > 0) {
      const standardAdminRoleId = standardAdminRole.rows[0].id;
      
      // First, remove any existing permissions for clean setup
      await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [standardAdminRoleId]);
      
      for (const permissionName of standardAdminPermissions) {
        const permission = await pool.query('SELECT id FROM permissions WHERE name = $1', [permissionName]);
        
        if (permission.rows.length > 0) {
          await pool.query(`
            INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
            VALUES ($1, $2, NOW(), NULL)
          `, [standardAdminRoleId, permission.rows[0].id]);
          console.log(`   ✅ Assigned ${permissionName} to standard_admin`);
        }
      }
    }

    // Regular admin gets most permissions (between standard_admin and super_admin)
    const adminRole = await pool.query('SELECT id FROM roles WHERE name = $1', ['admin']);
    const adminPermissions = [
      'users:view', 'users:create', 'users:update', 'users:delete',
      'pricing:view', 'pricing:create', 'pricing:update', 'pricing:delete',
      'admin:announcements', 'admin:chat', 'admin:minimum_entries', 'admin:orders'
      // NOTE: Excluding RBAC permissions - only super_admin gets those
    ];

    if (adminRole.rows.length > 0) {
      const adminRoleId = adminRole.rows[0].id;
      
      // Remove existing permissions first
      await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [adminRoleId]);
      
      for (const permissionName of adminPermissions) {
        const permission = await pool.query('SELECT id FROM permissions WHERE name = $1', [permissionName]);
        
        if (permission.rows.length > 0) {
          await pool.query(`
            INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
            VALUES ($1, $2, NOW(), NULL)
          `, [adminRoleId, permission.rows[0].id]);
        }
      }
      console.log(`   ✅ Assigned permissions to admin role`);
    }

    // 4. Assign RBAC roles to users based on their legacy roles
    console.log('\n4. Assigning RBAC roles to users...');

    // Get all users with admin-type legacy roles
    const adminUsers = await pool.query(`
      SELECT id, email, role as legacy_role 
      FROM users 
      WHERE role IN ('super_admin', 'admin', 'standard_admin') 
        AND status = 'approved' 
        AND is_active = true
    `);

    for (const user of adminUsers.rows) {
      // Check if user already has RBAC role assignment
      const existingAssignment = await pool.query(
        'SELECT id FROM user_roles WHERE user_id = $1 AND is_active = true',
        [user.id]
      );

      if (existingAssignment.rows.length === 0) {
        // Get the role ID for the user's legacy role
        const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [user.legacy_role]);
        
        if (roleResult.rows.length > 0) {
          await pool.query(`
            INSERT INTO user_roles (user_id, role_id, assigned_at, assigned_by, is_active)
            VALUES ($1, $2, NOW(), NULL, true)
          `, [user.id, roleResult.rows[0].id]);
          
          console.log(`   ✅ Assigned RBAC role '${user.legacy_role}' to user: ${user.email}`);
        }
      } else {
        console.log(`   ➡️ User already has RBAC role: ${user.email}`);
      }
    }

    // 5. Summary report
    console.log('\n5. RBAC Setup Summary:');
    console.log('═'.repeat(50));

    // Count roles
    const roleCount = await pool.query('SELECT COUNT(*) as count FROM roles WHERE is_active = true');
    console.log(`📋 Active Roles: ${roleCount.rows[0].count}`);

    // Count permissions  
    const permissionCount = await pool.query('SELECT COUNT(*) as count FROM permissions WHERE is_active = true');
    console.log(`🔐 Active Permissions: ${permissionCount.rows[0].count}`);

    // Count role-permission assignments
    const rolePermissionCount = await pool.query('SELECT COUNT(*) as count FROM role_permissions');
    console.log(`🔗 Role-Permission Assignments: ${rolePermissionCount.rows[0].count}`);

    // Count user-role assignments
    const userRoleCount = await pool.query('SELECT COUNT(*) as count FROM user_roles WHERE is_active = true');
    console.log(`👥 User-Role Assignments: ${userRoleCount.rows[0].count}`);

    // Show standard_admin users and their permissions
    console.log('\n📊 Standard Admin Users & Permissions:');
    const standardAdminUsers = await pool.query(`
      SELECT DISTINCT u.email, u.role as legacy_role
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name = 'standard_admin' AND ur.is_active = true
      ORDER BY u.email
    `);

    if (standardAdminUsers.rows.length > 0) {
      for (const user of standardAdminUsers.rows) {
        console.log(`   👤 ${user.email} (Legacy: ${user.legacy_role})`);
      }
      
      // Show what permissions standard_admin role has
      const standardAdminPerms = await pool.query(`
        SELECT p.name, p.description
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN roles r ON rp.role_id = r.id
        WHERE r.name = 'standard_admin' AND p.is_active = true
        ORDER BY p.name
      `);

      console.log('\n🔑 Standard Admin Permissions:');
      for (const perm of standardAdminPerms.rows) {
        const emoji = perm.name.includes('users') ? '👥' : 
                     perm.name.includes('pricing') ? '💰' : 
                     perm.name.includes('minimum_entries') ? '📊' : 
                     perm.name.includes('orders') ? '📋' : '⚙️';
        console.log(`   ${emoji} ${perm.name}: ${perm.description}`);
      }

      console.log('\n❌ Permissions NOT granted to standard_admin:');
      console.log('   💬 admin:chat: Manage Chat Support');
      console.log('   📢 admin:announcements: Manage Announcements');
      console.log('   🔧 rbac:*: RBAC Management (Super Admin only)');
    } else {
      console.log('   ⚠️ No standard_admin users found');
    }

    console.log('\n✅ RBAC setup completed successfully!');
    console.log('\n🔍 To test: Login as a standard_admin user and verify:');
    console.log('   ✅ Can access User Management, Pricing, Minimum Entries, Order Reports');
    console.log('   ❌ Cannot access Chat Support, Announcements (unless explicitly granted)');

  } catch (error) {
    console.error('❌ Error setting up RBAC data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the setup
setupRBACData().catch(console.error);