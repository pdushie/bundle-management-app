require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function assignClickyfiedSuperAdmin() {
  try {
    console.log('🔧 Assigning super admin role to Clickyfied Admin...');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not defined');
      process.exit(1);
    }
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Find the Clickyfied Admin user specifically
    console.log('🔍 Looking for Clickyfied Admin user...');
    const user = await sql`
      SELECT id, name, email, role 
      FROM users 
      WHERE id = 18 OR email = 'clickyfiedmaster@gmail.com'
      LIMIT 1
    `;
    
    if (user.length === 0) {
      console.log('❌ Clickyfied Admin user not found');
      return;
    }
    
    const clickyfiedUser = user[0];
    console.log(`✅ Found user: ${clickyfiedUser.name} (${clickyfiedUser.email}) [ID: ${clickyfiedUser.id}]`);
    console.log(`   Current legacy role: ${clickyfiedUser.role || 'none'}`);
    
    // Get the super_admin role ID
    const superAdminRole = await sql`
      SELECT id, name, display_name 
      FROM roles 
      WHERE name = 'super_admin'
    `;
    
    if (superAdminRole.length === 0) {
      console.error('❌ Super admin role not found in roles table');
      return;
    }
    
    const roleId = superAdminRole[0].id;
    console.log(`🎯 Super admin role found: ${superAdminRole[0].display_name} [ID: ${roleId}]`);
    
    // Check if user already has this role
    const existingRole = await sql`
      SELECT id, assigned_at
      FROM user_roles 
      WHERE user_id = ${clickyfiedUser.id} AND role_id = ${roleId} AND is_active = true
    `;
    
    if (existingRole.length > 0) {
      console.log(`✅ User already has super admin role (assigned: ${existingRole[0].assigned_at})`);
    } else {
      // Assign the role
      console.log('👑 Assigning super admin role...');
      const assignment = await sql`
        INSERT INTO user_roles (user_id, role_id, assigned_at, is_active)
        VALUES (${clickyfiedUser.id}, ${roleId}, CURRENT_TIMESTAMP, true)
        RETURNING id, assigned_at
      `;
      
      console.log(`✅ Super admin role assigned successfully! (Assignment ID: ${assignment[0].id})`);
    }
    
    // Update the legacy role field in users table
    try {
      await sql`
        UPDATE users 
        SET role = 'super_admin' 
        WHERE id = ${clickyfiedUser.id}
      `;
      console.log(`📝 Updated legacy role field to 'super_admin'`);
    } catch (error) {
      console.log(`⚠️  Could not update legacy role field: ${error.message}`);
    }
    
    // Show current user roles
    console.log('\n📊 Current roles for this user:');
    const userRoles = await sql`
      SELECT r.name, r.display_name, ur.assigned_at, ur.is_active
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ${clickyfiedUser.id}
      ORDER BY ur.assigned_at DESC
    `;
    
    if (userRoles.length === 0) {
      console.log('   (No roles assigned)');
    } else {
      userRoles.forEach(role => {
        const status = role.is_active ? '✅ Active' : '❌ Inactive';
        console.log(`   - ${role.display_name} (${role.name}) - ${status} - Assigned: ${role.assigned_at}`);
      });
    }
    
    console.log('\n🎉 Clickyfied Admin is now a Super Administrator!');
    console.log('🔗 Access the RBAC management at: http://localhost:3000/admin/rbac');
    console.log('👤 Log in with clickyfiedmaster@gmail.com to manage roles and permissions');
    
  } catch (error) {
    console.error('❌ Assignment failed:', error);
    console.error('Error details:', error.message);
  }
}

assignClickyfiedSuperAdmin();