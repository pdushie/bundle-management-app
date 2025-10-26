require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function completeRBACSetup() {
  try {
    console.log('🚀 Completing RBAC system setup...');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not defined');
      process.exit(1);
    }
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Add missing permissions
    console.log('🔐 Adding missing system permissions...');
    const missingPermissions = [
      // Billing and financial
      ['billing.read', 'View Billing', 'billing', 'read', 'View billing information and invoices'],
      ['billing.manage', 'Manage Billing', 'billing', 'manage', 'Full billing and payment management'],
      ['pricing.read', 'View Pricing', 'pricing', 'read', 'View pricing information'],
      ['pricing.manage', 'Manage Pricing', 'pricing', 'manage', 'Modify pricing and cost structures'],

      // Additional admin functions
      ['admin.reports', 'Admin Reports', 'admin', 'reports', 'Access to system reports and analytics'],
      ['admin.settings', 'Admin Settings', 'admin', 'settings', 'Modify system settings and configuration'],
      ['admin.announcements', 'Manage Announcements', 'admin', 'announcements', 'Create and manage system announcements'],
      ['admin.chat', 'Admin Chat', 'admin', 'chat', 'Access to admin chat system'],

      // RBAC system (super admin only)
      ['rbac.roles.read', 'View Roles', 'rbac', 'read', 'View role definitions and assignments'],
      ['rbac.roles.manage', 'Manage Roles', 'rbac', 'manage', 'Create, modify, and delete roles'],
      ['rbac.permissions.read', 'View Permissions', 'rbac', 'permissions', 'View system permissions'],
      ['rbac.users.manage', 'Manage User Roles', 'rbac', 'users', 'Assign and remove user roles'],

      // System features
      ['system.notifications', 'System Notifications', 'system', 'notifications', 'Access to system notifications'],
      ['system.history', 'System History', 'system', 'history', 'Access to system audit logs and history']
    ];

    for (const [name, displayName, resource, action, description] of missingPermissions) {
      try {
        await sql`
          INSERT INTO permissions (name, display_name, resource, action, description) 
          VALUES (${name}, ${displayName}, ${resource}, ${action}, ${description})
          ON CONFLICT (name) DO NOTHING
        `;
        console.log(`  ✅ Added permission: ${name}`);
      } catch (error) {
        if (!error.message.includes('duplicate key')) {
          console.log(`  ⚠️  Error adding ${name}: ${error.message}`);
        }
      }
    }

    // Ensure role assignments are complete
    console.log('🎯 Setting up role permissions...');
    
    // Super Admin gets all permissions
    await sql`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id 
      FROM roles r, permissions p 
      WHERE r.name = 'super_admin' AND p.is_active = true
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `;
    console.log('  ✅ Super Admin permissions assigned');

    // Admin gets most permissions except RBAC management
    await sql`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id 
      FROM roles r, permissions p 
      WHERE r.name = 'admin' AND p.resource != 'rbac' AND p.is_active = true
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `;
    console.log('  ✅ Admin permissions assigned');

    // Standard user gets basic permissions
    const userPermissions = [
      'orders.read', 'orders.create', 'billing.read', 'pricing.read', 'system.notifications'
    ];
    
    for (const permName of userPermissions) {
      await sql`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id 
        FROM roles r, permissions p 
        WHERE r.name = 'user' AND p.name = ${permName}
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `;
    }
    console.log('  ✅ User permissions assigned');

    // Viewer gets read-only permissions
    const viewerPermissions = [
      'orders.read', 'billing.read', 'pricing.read'
    ];
    
    for (const permName of viewerPermissions) {
      await sql`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id 
        FROM roles r, permissions p 
        WHERE r.name = 'viewer' AND p.name = ${permName}
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `;
    }
    console.log('  ✅ Viewer permissions assigned');

    // Get summary statistics
    const roleStats = await sql`
      SELECT 
        r.name,
        r.display_name,
        COUNT(rp.id) as permission_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id, r.name, r.display_name
      ORDER BY r.name
    `;

    console.log('\n📊 RBAC System Summary:');
    console.log('========================');
    for (const role of roleStats) {
      console.log(`${role.display_name}: ${role.permission_count} permissions`);
    }

    const totalPermissions = await sql`SELECT COUNT(*) as count FROM permissions WHERE is_active = true`;
    console.log(`\n🔑 Total active permissions: ${totalPermissions[0].count}`);

    console.log('\n✅ RBAC system setup completed successfully!');
    console.log('📌 Next steps:');
    console.log('   1. Assign super_admin role to your admin user');
    console.log('   2. Access RBAC management at: /admin/rbac');
    console.log('   3. Start managing user roles and permissions');
    
  } catch (error) {
    console.error('❌ RBAC setup failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

completeRBACSetup();