require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkUserRoles() {
  try {
    console.log('🔍 Checking roles for admin@example.com...');
    
    // Get user details
    const userResult = await sql`
      SELECT id, name, email, role, status, is_active 
      FROM users 
      WHERE email = 'admin@example.com'
    `;
    
    if (userResult.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = userResult[0];
    console.log('👤 User details:', {
      id: user.id,
      name: user.name,
      email: user.email,
      legacyRole: user.role,
      status: user.status,
      isActive: user.is_active
    });
    
    // Get RBAC roles
    const rolesResult = await sql`
      SELECT r.id as role_id, r.name as role_name, r.display_name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ${user.id}
    `;
    
    console.log('🎭 RBAC Roles assigned:');
    if (rolesResult.length === 0) {
      console.log('⚠️  No RBAC roles assigned to this user!');
    } else {
      rolesResult.forEach(role => {
        console.log(`   - ${role.display_name} (${role.role_name}) [ID: ${role.role_id}]`);
      });
    }
    
    // Check if user has super_admin role
    const hasSuperAdmin = rolesResult.some(role => role.role_name === 'super_admin');
    console.log('🔑 Has Super Admin access:', hasSuperAdmin ? '✅ YES' : '❌ NO');
    
    console.log('');
    console.log('📊 All available roles:');
    const allRoles = await sql`SELECT id, name, display_name FROM roles ORDER BY display_name`;
    allRoles.forEach(role => {
      console.log(`   - ${role.display_name} (${role.name}) [ID: ${role.id}]`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUserRoles();