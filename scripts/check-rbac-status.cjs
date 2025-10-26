require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function checkRBACTables() {
  try {
    console.log('🔍 Checking RBAC table status...');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not defined');
      process.exit(1);
    }
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Check if tables exist
    const tables = ['roles', 'permissions', 'role_permissions', 'user_roles'];
    
    for (const table of tables) {
      try {
        const result = await sql`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_name = ${table}
        `;
        const exists = result[0].count > 0;
        console.log(`📊 Table '${table}': ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
        
        if (exists) {
          const countResult = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
          console.log(`   📈 Records: ${countResult[0].count}`);
        }
      } catch (error) {
        console.log(`📊 Table '${table}': ERROR - ${error.message}`);
      }
    }
    
    // Check specific data
    console.log('\n🔍 Checking existing data...');
    
    try {
      const rolesResult = await sql`SELECT * FROM roles ORDER BY name`;
      console.log(`👑 Roles (${rolesResult.length}):`, rolesResult.map(r => r.name).join(', '));
    } catch (error) {
      console.log('👑 Roles: Error checking -', error.message);
    }
    
    try {
      const permissionsResult = await sql`SELECT resource, action FROM permissions ORDER BY resource, action`;
      const grouped = permissionsResult.reduce((acc, p) => {
        if (!acc[p.resource]) acc[p.resource] = [];
        acc[p.resource].push(p.action);
        return acc;
      }, {});
      
      console.log(`🔑 Permissions by resource:`);
      for (const [resource, actions] of Object.entries(grouped)) {
        console.log(`   ${resource}: ${actions.join(', ')}`);
      }
    } catch (error) {
      console.log('🔑 Permissions: Error checking -', error.message);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkRBACTables();