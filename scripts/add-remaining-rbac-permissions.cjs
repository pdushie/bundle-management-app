require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function addRemainingPermissions() {
  try {
    console.log('🔐 Adding remaining RBAC permissions...');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not defined');
      process.exit(1);
    }
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Add the remaining permissions that the admin dashboard needs
    const remainingPermissions = [
      // Complete user management permissions
      ['users:create', 'Create Users', 'users', 'create', 'Create new user accounts'],
      ['users:update', 'Update Users', 'users', 'update', 'Update user information and status'],
      ['users:delete', 'Delete Users', 'users', 'delete', 'Delete user accounts'],
    ];

    for (const [name, displayName, resource, action, description] of remainingPermissions) {
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

    console.log('\n✅ All remaining permissions added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding remaining permissions:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

addRemainingPermissions();