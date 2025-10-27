const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function setupModeratorRole() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Setting up Moderator role and permissions...\n');

    // 1. Create the moderator role
    console.log('1. Creating moderator role...');
    const existingRole = await pool.query('SELECT id FROM roles WHERE name = $1', ['moderator']);
    
    let moderatorRoleId;
    if (existingRole.rows.length === 0) {
      const result = await pool.query(`
        INSERT INTO roles (name, display_name, description, is_active, is_system_role, created_at)
        VALUES ($1, $2, $3, true, true, NOW())
        RETURNING id
      `, [
        'moderator',
        'Moderator',
        'Limited administrative access to bundle allocator, categorizer, and order management only'
      ]);
      moderatorRoleId = result.rows[0].id;
      console.log('   ✅ Created moderator role');
    } else {
      moderatorRoleId = existingRole.rows[0].id;
      console.log('   ➡️ Moderator role already exists');
    }

    // 2. Define permissions for moderator role
    console.log('\n2. Defining moderator permissions...');
    
    const moderatorPermissions = [
      // Bundle management permissions
      { 
        name: 'bundles:allocator', 
        displayName: 'Bundle Allocator Access', 
        description: 'Access to bundle allocator functionality', 
        resource: 'bundles', 
        action: 'allocator' 
      },
      { 
        name: 'bundles:categorizer', 
        displayName: 'Bundle Categorizer Access', 
        description: 'Access to bundle categorizer functionality', 
        resource: 'bundles', 
        action: 'categorizer' 
      },
      
      // Order management permissions (view only)
      { 
        name: 'orders:view', 
        displayName: 'View Orders', 
        description: 'View pending and submitted orders', 
        resource: 'orders', 
        action: 'view' 
      },
      { 
        name: 'orders:processed:view', 
        displayName: 'View Processed Orders', 
        description: 'View processed orders and their details', 
        resource: 'orders_processed', 
        action: 'view' 
      },
      { 
        name: 'orders:track', 
        displayName: 'Track Orders', 
        description: 'Access order tracking functionality', 
        resource: 'orders', 
        action: 'track' 
      }
    ];

    // Create permissions if they don't exist
    const createdPermissions = [];
    for (const permission of moderatorPermissions) {
      const existingPermission = await pool.query('SELECT id FROM permissions WHERE name = $1', [permission.name]);
      
      let permissionId;
      if (existingPermission.rows.length === 0) {
        const result = await pool.query(`
          INSERT INTO permissions (name, display_name, description, resource, action, is_active, created_at)
          VALUES ($1, $2, $3, $4, $5, true, NOW())
          RETURNING id
        `, [permission.name, permission.displayName, permission.description, permission.resource, permission.action]);
        permissionId = result.rows[0].id;
        console.log(`   ✅ Created permission: ${permission.name}`);
      } else {
        permissionId = existingPermission.rows[0].id;
        console.log(`   ➡️ Permission already exists: ${permission.name}`);
      }
      
      createdPermissions.push({ id: permissionId, name: permission.name });
    }

    // 3. Assign permissions to moderator role
    console.log('\n3. Assigning permissions to moderator role...');
    
    // First, remove any existing permissions for clean setup
    await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [moderatorRoleId]);
    
    for (const permission of createdPermissions) {
      await pool.query(`
        INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by)
        VALUES ($1, $2, NOW(), NULL)
      `, [moderatorRoleId, permission.id]);
      console.log(`   ✅ Assigned ${permission.name} to moderator role`);
    }

    // 4. Show summary
    console.log('\n4. Moderator Role Setup Summary:');
    console.log('═'.repeat(50));

    const roleDetails = await pool.query(`
      SELECT r.name, r.display_name, r.description
      FROM roles r
      WHERE r.id = $1
    `, [moderatorRoleId]);

    const rolePermissions = await pool.query(`
      SELECT p.name, p.display_name, p.description
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.name
    `, [moderatorRoleId]);

    console.log(`📋 Role: ${roleDetails.rows[0].display_name}`);
    console.log(`📝 Description: ${roleDetails.rows[0].description}`);
    console.log(`🔐 Permissions (${rolePermissions.rows.length} total):`);
    
    for (const perm of rolePermissions.rows) {
      const emoji = perm.name.includes('bundles:allocator') ? '📦' : 
                   perm.name.includes('bundles:categorizer') ? '🏷️' : 
                   perm.name.includes('orders:view') ? '📋' : 
                   perm.name.includes('orders:processed') ? '✅' : 
                   perm.name.includes('orders:track') ? '🔍' : '⚙️';
      console.log(`   ${emoji} ${perm.display_name}: ${perm.description}`);
    }

    console.log('\n✅ Moderator role setup completed successfully!');
    
    console.log('\n🔧 Next Steps:');
    console.log('   1. Update middleware.ts to include "moderator" role in admin access');
    console.log('   2. Update auth.ts to include "moderator" in role hierarchies');
    console.log('   3. Update admin layout to show appropriate navigation for moderators');
    console.log('   4. Test by assigning moderator role to a user');

    console.log('\n📝 Moderator Access Will Include:');
    console.log('   ✅ Bundle Allocator - Full access to data allocation features');
    console.log('   ✅ Bundle Categorizer - Full access to data categorization features');
    console.log('   ✅ Orders - View pending and submitted orders');
    console.log('   ✅ Processed Orders - View completed/processed orders');
    console.log('   ✅ Track Orders - Access order tracking functionality');
    console.log('   ❌ User Management - No access');
    console.log('   ❌ Pricing Management - No access');
    console.log('   ❌ Chat Support - No access');
    console.log('   ❌ Announcements - No access');
    console.log('   ❌ RBAC Management - No access');
    console.log('   ❌ System Settings - No access');

  } catch (error) {
    console.error('❌ Error setting up moderator role:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the setup
setupModeratorRole().catch(console.error);