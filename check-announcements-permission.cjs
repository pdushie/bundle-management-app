require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const neonClient = neon(process.env.DATABASE_URL);

async function checkAnnouncementsPermission() {
  try {
    console.log('Checking admin.announcements permission...\n');
    
    // Check if the permission exists
    const permission = await neonClient`
      SELECT id, name FROM permissions WHERE name = 'admin.announcements'
    `;
    
    if (permission.length === 0) {
      console.log('❌ admin.announcements permission does not exist');
      
      // Show all admin permissions
      const adminPerms = await neonClient`
        SELECT name FROM permissions WHERE name LIKE 'admin.%' ORDER BY name
      `;
      console.log('Available admin permissions:');
      adminPerms.forEach(p => console.log('  -', p.name));
      
      return;
    }
    
    console.log('✅ admin.announcements permission exists');
    
    // Check which roles have this permission
    const rolePermissions = await neonClient`
      SELECT r.name as role_name
      FROM roles r
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE p.name = 'admin.announcements'
    `;
    
    console.log('Roles with admin.announcements permission:');
    rolePermissions.forEach(rp => console.log('  -', rp.role_name));
    
    // Check standard_admin users specifically
    const standardAdminUsers = await neonClient`
      SELECT u.email, 
             CASE WHEN rp.permission_id IS NOT NULL THEN true ELSE false END as has_permission
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.permission_id = ${permission[0].id}
      WHERE u.role = 'standard_admin' AND ur.is_active = true
    `;
    
    console.log('\nStandard admin users and their announcements permission:');
    standardAdminUsers.forEach(u => {
      console.log(`  - ${u.email}: ${u.has_permission ? '✅ Has permission' : '❌ No permission'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAnnouncementsPermission();