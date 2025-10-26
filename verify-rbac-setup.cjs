const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function verifyRBACSetup() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 Verifying RBAC Setup...\n');

    // 1. Check roles
    console.log('1. Checking Roles:');
    const roles = await pool.query(`
      SELECT name, display_name, is_active, 
             (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id AND ur.is_active = true) as user_count,
             (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) as permission_count
      FROM roles r 
      WHERE r.is_active = true 
      ORDER BY r.name
    `);

    roles.rows.forEach(role => {
      console.log(`   📋 ${role.name} (${role.display_name})`);
      console.log(`      👥 Users: ${role.user_count} | 🔐 Permissions: ${role.permission_count}`);
    });

    // 2. Check specific user permissions
    console.log('\n2. Checking User Permissions:');
    
    // Find a standard_admin user to test
    const standardAdminUser = await pool.query(`
      SELECT u.id, u.email, u.role as legacy_role
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name = 'standard_admin' AND ur.is_active = true
      LIMIT 1
    `);

    if (standardAdminUser.rows.length > 0) {
      const user = standardAdminUser.rows[0];
      console.log(`   👤 Testing permissions for: ${user.email}`);

      // Get user's permissions through RBAC
      const userPermissions = await pool.query(`
        SELECT DISTINCT p.name, p.description
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 AND ur.is_active = true AND p.is_active = true
        ORDER BY p.name
      `, [user.id]);

      console.log(`   📋 Permissions (${userPermissions.rows.length} total):`);
      userPermissions.rows.forEach(perm => {
        const emoji = perm.name.includes('users') ? '👥' : 
                     perm.name.includes('pricing') ? '💰' : 
                     perm.name.includes('admin:chat') ? '💬' : 
                     perm.name.includes('admin:announcements') ? '📢' : 
                     perm.name.includes('minimum_entries') ? '📊' : 
                     perm.name.includes('orders') ? '📋' : '⚙️';
        console.log(`      ${emoji} ${perm.name}`);
      });

      // Check specific permissions that should/shouldn't exist
      const testPermissions = [
        { name: 'users:view', should: true, description: 'User Management access' },
        { name: 'pricing:view', should: true, description: 'Pricing Management access' },
        { name: 'admin:chat', should: false, description: 'Chat Support access' },
        { name: 'admin:announcements', should: false, description: 'Announcements access' },
        { name: 'admin:minimum_entries', should: true, description: 'Minimum Entries access' },
        { name: 'rbac:view', should: false, description: 'RBAC Management access' }
      ];

      console.log('\n   🧪 Permission Test Results:');
      for (const test of testPermissions) {
        const hasPermission = userPermissions.rows.some(p => p.name === test.name);
        const status = hasPermission === test.should ? '✅' : '❌';
        const expectation = test.should ? 'SHOULD HAVE' : 'SHOULD NOT HAVE';
        console.log(`      ${status} ${test.name} (${expectation}) - ${test.description}`);
      }

    } else {
      console.log('   ⚠️ No standard_admin users found for testing');
    }

    // 3. Check API permissions endpoint
    console.log('\n3. Testing API Permissions Endpoint:');
    
    // This would normally be tested via HTTP request, but we can simulate the query
    if (standardAdminUser.rows.length > 0) {
      const userId = standardAdminUser.rows[0].id;
      
      // This is the same query used by the API
      const apiResult = await pool.query(`
        SELECT p.name, p.description
        FROM user_roles ur
        INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
        INNER JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = $1 AND ur.is_active = true AND p.is_active = true
        GROUP BY p.id, p.name, p.description
        ORDER BY p.name
      `, [userId]);

      console.log(`   📡 API would return ${apiResult.rows.length} permissions for user ${userId}`);
      
      // Test the frontend permission check logic
      const permissionNames = apiResult.rows.map(p => p.name);
      
      const hasUserPermissions = permissionNames.some(p => 
        ['users:view', 'users:create', 'users:update', 'users:delete'].includes(p)
      );
      const hasChatPermission = permissionNames.includes('admin:chat');
      const hasAnnouncementsPermission = permissionNames.includes('admin:announcements');

      console.log(`   🔍 Frontend Logic Tests:`);
      console.log(`      👥 User Management tabs: ${hasUserPermissions ? '✅ VISIBLE' : '❌ HIDDEN'}`);
      console.log(`      💬 Chat Support link: ${hasChatPermission ? '✅ VISIBLE' : '❌ HIDDEN'}`);
      console.log(`      📢 Announcements link: ${hasAnnouncementsPermission ? '✅ VISIBLE' : '❌ HIDDEN'}`);
    }

    // 4. Summary
    console.log('\n4. Summary:');
    console.log('═'.repeat(50));
    
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE status = \'approved\' AND is_active = true');
    const rbacUsers = await pool.query('SELECT COUNT(*) as count FROM user_roles WHERE is_active = true');
    
    console.log(`📊 Total Active Users: ${totalUsers.rows[0].count}`);
    console.log(`🔗 Users with RBAC Roles: ${rbacUsers.rows[0].count}`);
    
    if (parseInt(rbacUsers.rows[0].count) < parseInt(totalUsers.rows[0].count)) {
      console.log('⚠️  Some users may not have RBAC roles assigned');
    }

    // Check for orphaned permissions
    const orphanedPermissions = await pool.query(`
      SELECT p.name 
      FROM permissions p 
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id 
      WHERE rp.permission_id IS NULL AND p.is_active = true
    `);

    if (orphanedPermissions.rows.length > 0) {
      console.log(`⚠️  Found ${orphanedPermissions.rows.length} permissions not assigned to any role`);
    }

    console.log('\n✅ RBAC verification completed!');

  } catch (error) {
    console.error('❌ Error verifying RBAC setup:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the verification
verifyRBACSetup().catch(console.error);