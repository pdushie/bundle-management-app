require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function migrateUserRolesToRBAC() {
  try {
    console.log('🔄 Migrating existing user roles to RBAC system...');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not defined');
      process.exit(1);
    }
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Get all users with roles from the users table
    console.log('📋 Checking existing user roles...');
    const usersWithRoles = await sql`
      SELECT id, name, email, role 
      FROM users 
      WHERE role IS NOT NULL AND role != '' AND is_active = true
      ORDER BY name
    `;
    
    if (usersWithRoles.length === 0) {
      console.log('ℹ️  No users with legacy roles found');
      return;
    }
    
    console.log(`✅ Found ${usersWithRoles.length} users with legacy roles:`);
    usersWithRoles.forEach(user => {
      console.log(`   - ${user.name} (${user.email}): ${user.role}`);
    });
    
    // Get all available roles from the RBAC roles table
    const rbacRoles = await sql`
      SELECT id, name, display_name 
      FROM roles 
      WHERE is_active = true
    `;
    
    console.log(`\n🎯 Available RBAC roles:`);
    rbacRoles.forEach(role => {
      console.log(`   - ${role.display_name} (${role.name}) [ID: ${role.id}]`);
    });
    
    // Create a mapping of legacy roles to RBAC roles
    const roleMapping = {
      'admin': 'admin',
      'superadmin': 'super_admin',
      'super_admin': 'super_admin',
      'user': 'user',
      'viewer': 'viewer'
    };
    
    console.log(`\n🔄 Starting role migration...`);
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const user of usersWithRoles) {
      const legacyRole = user.role.toLowerCase();
      const rbacRoleName = roleMapping[legacyRole];
      
      if (!rbacRoleName) {
        console.log(`   ⚠️  ${user.name}: Unknown legacy role '${user.role}' - skipping`);
        skippedCount++;
        continue;
      }
      
      // Find the RBAC role ID
      const rbacRole = rbacRoles.find(r => r.name === rbacRoleName);
      if (!rbacRole) {
        console.log(`   ❌ ${user.name}: RBAC role '${rbacRoleName}' not found - skipping`);
        errorCount++;
        continue;
      }
      
      try {
        // Check if user already has this role in RBAC
        const existingAssignment = await sql`
          SELECT id 
          FROM user_roles 
          WHERE user_id = ${user.id} AND role_id = ${rbacRole.id} AND is_active = true
        `;
        
        if (existingAssignment.length > 0) {
          console.log(`   ✅ ${user.name}: Already has ${rbacRole.display_name} role`);
          continue;
        }
        
        // Assign the role
        await sql`
          INSERT INTO user_roles (user_id, role_id, assigned_at, is_active)
          VALUES (${user.id}, ${rbacRole.id}, CURRENT_TIMESTAMP, true)
        `;
        
        console.log(`   ✅ ${user.name}: Migrated '${user.role}' → '${rbacRole.display_name}'`);
        migratedCount++;
        
      } catch (error) {
        console.log(`   ❌ ${user.name}: Migration failed - ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migratedCount} users`);
    console.log(`   ⚠️  Skipped (unknown roles): ${skippedCount} users`);
    console.log(`   ❌ Errors: ${errorCount} users`);
    
    // Show current RBAC assignments
    console.log('\n🔍 Current RBAC role assignments:');
    const currentAssignments = await sql`
      SELECT u.name, u.email, r.display_name as role_name, ur.assigned_at
      FROM user_roles ur
      JOIN users u ON ur.user_id = u.id
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.is_active = true
      ORDER BY r.display_name, u.name
    `;
    
    const groupedAssignments = currentAssignments.reduce((acc, assignment) => {
      if (!acc[assignment.role_name]) {
        acc[assignment.role_name] = [];
      }
      acc[assignment.role_name].push(assignment);
      return acc;
    }, {});
    
    Object.entries(groupedAssignments).forEach(([roleName, users]) => {
      console.log(`\n   ${roleName} (${users.length} users):`);
      users.forEach(user => {
        console.log(`     - ${user.name} (${user.email})`);
      });
    });
    
    // Provide next steps
    console.log('\n🎉 Legacy role migration completed!');
    console.log('\n📌 Next Steps:');
    console.log('1. Verify the role assignments are correct in the RBAC interface');
    console.log('2. Consider removing the legacy role column from users table once satisfied');
    console.log('3. Update authentication logic to use RBAC instead of legacy roles');
    console.log('4. Test the system with the new role assignments');
    
    if (migratedCount > 0) {
      console.log('\n🔗 Access RBAC management at: http://localhost:3000/admin/rbac');
      console.log('👤 Log in as a super admin to verify the role assignments');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

migrateUserRolesToRBAC();