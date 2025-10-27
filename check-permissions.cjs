const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkStandardAdminPermissions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Get standard_admin role permissions
    const result = await pool.query(`
      SELECT p.name, p.display_name, p.description
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN roles r ON rp.role_id = r.id
      WHERE r.name = 'standard_admin'
      ORDER BY p.name
    `);
    
    console.log('Standard Admin Permissions:');
    console.log('='.repeat(50));
    result.rows.forEach(perm => {
      console.log(`- ${perm.name}: ${perm.display_name}`);
    });
    
    const hasChatPermission = result.rows.some(p => p.name === 'admin.chat');
    console.log(`\nHas admin.chat permission: ${hasChatPermission}`);
    
    // Check what the permission name should be in the database
    const adminChatPermissions = await pool.query(`
      SELECT name, display_name 
      FROM permissions 
      WHERE name LIKE '%chat%' OR display_name LIKE '%chat%'
      ORDER BY name
    `);
    
    console.log('\nAvailable chat-related permissions:');
    adminChatPermissions.rows.forEach(perm => {
      console.log(`- ${perm.name}: ${perm.display_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkStandardAdminPermissions();