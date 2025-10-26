require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function addMissingPermissions() {
  try {
    console.log('🔐 Adding missing RBAC permissions...');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not defined');
      process.exit(1);
    }
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Add the permissions that the admin dashboard is looking for
    const missingPermissions = [
      // User management permissions (using colon notation)
      ['users:view', 'View Users', 'users', 'view', 'View user information and accounts'],
      ['users:create', 'Create Users', 'users', 'create', 'Create new user accounts'],
      ['users:update', 'Update Users', 'users', 'update', 'Update user information and status'],
      ['users:delete', 'Delete Users', 'users', 'delete', 'Delete user accounts'],
      ['users:approve', 'Approve Users', 'users', 'approve', 'Approve pending user registrations'],

      // Pricing management permissions
      ['pricing:view', 'View Pricing', 'pricing', 'view', 'View pricing profiles and rates'],
      ['pricing:create', 'Create Pricing', 'pricing', 'create', 'Create new pricing profiles'],
      ['pricing:update', 'Update Pricing', 'pricing', 'update', 'Update pricing profiles and rates'],
      ['pricing:delete', 'Delete Pricing', 'pricing', 'delete', 'Delete pricing profiles'],

      // Admin system permissions
      ['admin:settings', 'Admin Settings', 'admin', 'settings', 'Access admin system settings'],
      ['admin:minimum_entries', 'Minimum Entries Management', 'admin', 'minimum_entries', 'Manage minimum entry requirements'],
      ['admin:orders', 'Order Management', 'admin', 'orders', 'View and manage order reports'],
      ['admin:announcements', 'Manage Announcements', 'admin', 'announcements', 'Create and manage system announcements'],
      ['admin:stats', 'Admin Statistics', 'admin', 'stats', 'View admin dashboard statistics'],

      // RBAC management permissions
      ['rbac:roles:view', 'View Roles', 'rbac', 'roles_view', 'View role definitions and assignments'],
      ['rbac:roles:create', 'Create Roles', 'rbac', 'roles_create', 'Create new system roles'],
      ['rbac:roles:update', 'Update Roles', 'rbac', 'roles_update', 'Update role information and permissions'],
      ['rbac:roles:delete', 'Delete Roles', 'rbac', 'roles_delete', 'Delete non-system roles'],
      ['rbac:permissions:view', 'View Permissions', 'rbac', 'permissions_view', 'View system permissions'],
      ['rbac:users:manage', 'Manage User Roles', 'rbac', 'users_manage', 'Assign and remove user roles']
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

    // Check current permissions
    console.log('\n📋 Current permissions in database:');
    const allPermissions = await sql`SELECT name, display_name, resource, action FROM permissions ORDER BY resource, action`;
    
    console.log('\nUser Management Permissions:');
    allPermissions.filter(p => p.resource === 'users').forEach(p => {
      console.log(`  - ${p.name}: ${p.display_name}`);
    });

    console.log('\nPricing Management Permissions:');
    allPermissions.filter(p => p.resource === 'pricing').forEach(p => {
      console.log(`  - ${p.name}: ${p.display_name}`);
    });

    console.log('\nAdmin Permissions:');
    allPermissions.filter(p => p.resource === 'admin').forEach(p => {
      console.log(`  - ${p.name}: ${p.display_name}`);
    });

    console.log('\nRBAC Permissions:');
    allPermissions.filter(p => p.resource === 'rbac').forEach(p => {
      console.log(`  - ${p.name}: ${p.display_name}`);
    });

    console.log('\n✅ Missing permissions added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding missing permissions:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

addMissingPermissions();