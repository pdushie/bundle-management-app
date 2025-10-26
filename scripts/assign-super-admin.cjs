require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function assignSuperAdminRole() {
  try {
    console.log('👑 Assigning Super Admin role...');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not defined');
      process.exit(1);
    }
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Get all users
    const users = await sql`SELECT id, name, email FROM users WHERE is_active = true ORDER BY name`;
    
    if (users.length === 0) {
      console.log('❌ No active users found in the system');
      return;
    }
    
    console.log('\n📋 Available users:');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - ID: ${user.id}`);
    });
    
    // For demonstration, let's assign super_admin to the first user
    // In a real scenario, you'd want to prompt for selection
    const targetUser = users[0];
    
    // Get super_admin role ID
    const superAdminRole = await sql`SELECT id FROM roles WHERE name = 'super_admin'`;
    
    if (superAdminRole.length === 0) {
      console.log('❌ Super admin role not found');
      return;
    }
    
    const roleId = superAdminRole[0].id;
    
    // Check if user already has super admin role
    const existingAssignment = await sql`
      SELECT id FROM user_roles 
      WHERE user_id = ${targetUser.id} AND role_id = ${roleId} AND is_active = true
    `;
    
    if (existingAssignment.length > 0) {
      console.log(`✅ User ${targetUser.name} already has super admin role`);
      return;
    }
    
    // Assign super admin role
    await sql`
      INSERT INTO user_roles (user_id, role_id, assigned_at, is_active)
      VALUES (${targetUser.id}, ${roleId}, NOW(), true)
    `;
    
    console.log(`✅ Successfully assigned super admin role to ${targetUser.name} (${targetUser.email})`);
    console.log(`📌 They can now access RBAC management at: /admin/rbac`);
    
    // Show summary
    const userRoles = await sql`
      SELECT r.name, r.display_name 
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ${targetUser.id} AND ur.is_active = true
    `;
    
    console.log(`\n👤 ${targetUser.name}'s roles:`);
    userRoles.forEach(role => {
      console.log(`  - ${role.display_name} (${role.name})`);
    });
    
  } catch (error) {
    console.error('❌ Failed to assign super admin role:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

assignSuperAdminRole();