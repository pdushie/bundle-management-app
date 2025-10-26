const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🚀 Starting RBAC migration...');
    
    // Check for DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not defined');
      process.exit(1);
    }
    
    // Create Neon client
    const sql = neon(process.env.DATABASE_URL);
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/add-rbac-system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the migration into individual statements (Neon doesn't support multi-statement queries)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📝 Executing ${statements.length} migration statements...`);
    
    // Execute each statement separately
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sql`${statement}`;
        } catch (error) {
          // Log but continue if table already exists
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Table/constraint already exists, continuing...`);
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('✅ RBAC migration completed successfully!');
    console.log('📊 Created tables: roles, permissions, role_permissions, user_roles');
    console.log('👑 Default roles created: super_admin, admin, user, viewer');
    console.log('🔑 System permissions configured');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration();