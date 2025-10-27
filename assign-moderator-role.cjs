const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function assignModeratorRole() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Assigning moderator role to test user...\n');

    // Get the moderator role ID
    const moderatorRole = await pool.query('SELECT id FROM roles WHERE name = $1', ['moderator']);
    
    if (moderatorRole.rows.length === 0) {
      console.error('❌ Moderator role not found! Please run setup-moderator-role.cjs first.');
      return;
    }
    
    const moderatorRoleId = moderatorRole.rows[0].id;
    console.log(`📋 Found moderator role with ID: ${moderatorRoleId}`);

    // List available users (excluding the super admin)
    const users = await pool.query(`
      SELECT id, email, role, status, is_active 
      FROM users 
      WHERE status = 'approved' AND is_active = true AND role != 'super_admin'
      ORDER BY email
    `);

    if (users.rows.length === 0) {
      console.log('❌ No suitable users found for testing. Creating a test user...');
      
      // Create a test user
      const testEmail = 'moderator@test.com';
      const testUser = await pool.query(`
        INSERT INTO users (name, email, hashed_password, role, status, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, email
      `, [
        'Test Moderator',
        testEmail,
        '$2a$12$dummy.hash.for.testing.purposes.only', // Dummy hash
        'user',
        'approved',
        true,
        true
      ]);
      
      const userId = testUser.rows[0].id;
      console.log(`✅ Created test user: ${testEmail} (ID: ${userId})`);
      
      // Assign moderator role to the test user
      await assignRoleToUser(pool, userId, moderatorRoleId, testEmail);
      
    } else {
      console.log('\n👥 Available users for moderator role assignment:');
      users.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (ID: ${user.id}, Current Role: ${user.role})`);
      });

      // For this demo, assign to the first available user
      const selectedUser = users.rows[0];
      console.log(`\n🎯 Assigning moderator role to: ${selectedUser.email}`);
      
      await assignRoleToUser(pool, selectedUser.id, moderatorRoleId, selectedUser.email);
    }

  } catch (error) {
    console.error('❌ Error assigning moderator role:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function assignRoleToUser(pool, userId, moderatorRoleId, userEmail) {
  // Check if user already has the moderator role
  const existingAssignment = await pool.query(
    'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2 AND is_active = true',
    [userId, moderatorRoleId]
  );

  if (existingAssignment.rows.length > 0) {
    console.log(`   ➡️ User ${userEmail} already has moderator role assigned`);
    return;
  }

  // Deactivate any existing role assignments for this user
  await pool.query(
    'UPDATE user_roles SET is_active = false WHERE user_id = $1 AND is_active = true',
    [userId]
  );

  // Assign the moderator role
  await pool.query(`
    INSERT INTO user_roles (user_id, role_id, assigned_at, assigned_by, is_active)
    VALUES ($1, $2, NOW(), NULL, true)
  `, [userId, moderatorRoleId]);

  console.log(`   ✅ Successfully assigned moderator role to: ${userEmail}`);

  // Verify the assignment by checking permissions
  const userPermissions = await pool.query(`
    SELECT p.name, p.display_name
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = $1 AND ur.is_active = true
    ORDER BY p.name
  `, [userId]);

  console.log(`\n🔐 Moderator permissions for ${userEmail}:`);
  userPermissions.rows.forEach(perm => {
    const emoji = perm.name.includes('bundles:allocator') ? '📦' : 
                 perm.name.includes('bundles:categorizer') ? '🏷️' : 
                 perm.name.includes('orders:view') ? '📋' : 
                 perm.name.includes('orders:processed') ? '✅' : 
                 perm.name.includes('orders:track') ? '🔍' : '⚙️';
    console.log(`   ${emoji} ${perm.display_name}`);
  });

  console.log(`\n✅ Moderator role assignment completed!`);
  console.log(`\n🔧 Testing Instructions:`);
  console.log(`   1. Login as: ${userEmail}`);
  console.log(`   2. Navigate to /admin - should see limited navigation`);
  console.log(`   3. Verify access to:`);
  console.log(`      ✅ Bundle Allocator (/?tab=bundle-allocator)`);
  console.log(`      ✅ Bundle Categorizer (/?tab=bundle-categorizer)`);
  console.log(`      ✅ Orders (/?tab=orders)`);
  console.log(`      ✅ Processed Orders (/?tab=processed-orders)`);
  console.log(`      ✅ Track Orders (/?tab=track-orders)`);
  console.log(`   4. Verify NO access to:`);
  console.log(`      ❌ User Management`);
  console.log(`      ❌ Pricing Management`);
  console.log(`      ❌ Chat Support`);
  console.log(`      ❌ Announcements`);
  console.log(`      ❌ RBAC Management`);
  console.log(`      ❌ System Settings`);
}

// Run the assignment
assignModeratorRole().catch(console.error);