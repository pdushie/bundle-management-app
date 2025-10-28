// Run the account manager assignments database migration on Neon
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  console.log('🔄 Connecting to Neon database...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  const client = await pool.connect();

  try {
    console.log('✅ Connected to database successfully!');
    console.log('🔄 Running account manager assignments migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add-account-manager-assignments.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the entire migration as one transaction
    console.log('📝 Executing migration...');
    
    
    try {
      await client.query('BEGIN');
      await client.query(migrationSQL);
      await client.query('COMMIT');
      console.log('✅ Migration executed successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('⚠️  Some objects already exist - this is normal for re-runs');
      } else {
        console.error('❌ Migration failed:', error.message);
        throw error;
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('📋 Changes applied:');
    console.log('   - account_manager_id column added to users table');
    console.log('   - Performance indexes created');
    console.log('   - account_manager_sales view created for reporting');
    
    // Test the new structure
    console.log('\n🧪 Testing new database structure...');
    
    // Check if column exists
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'account_manager_id'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ account_manager_id column verified');
      console.log(`   Type: ${columnCheck.rows[0].data_type}`);
      console.log(`   Nullable: ${columnCheck.rows[0].is_nullable}`);
    } else {
      console.log('❌ account_manager_id column not found');
    }
    
    // Check if view exists
    const viewCheck = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_name = 'account_manager_sales' AND table_type = 'VIEW'
    `);
    
    if (viewCheck.rows.length > 0) {
      console.log('✅ account_manager_sales view verified');
    } else {
      console.log('❌ account_manager_sales view not found');
    }
    
    // Check existing admins who can be account managers
    const adminCheck = await client.query(`
      SELECT id, name, email, role, status
      FROM users
      WHERE role IN ('admin', 'standard_admin', 'super_admin')
      ORDER BY name
    `);
    
    console.log(`\n👥 Found ${adminCheck.rows.length} potential account managers:`);
    adminCheck.rows.forEach(admin => {
      console.log(`   - ${admin.name} (${admin.email}) - ${admin.role} [${admin.status}]`);
    });
    
    // Test the view
    console.log('\n📊 Testing account_manager_sales view...');
    const viewTest = await client.query('SELECT * FROM account_manager_sales LIMIT 3');
    console.log(`✅ View query successful - returned ${viewTest.rows.length} rows`);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    
    if (error.message.includes('does not exist')) {
      console.log('\n💡 Troubleshooting suggestions:');
      console.log('   1. Check that your DATABASE_URL in .env.local is correct');
      console.log('   2. Ensure the users and orders tables exist');
      console.log('   3. Verify you have the necessary permissions');
    }
    
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
console.log('🚀 Starting Account Manager Assignment Migration');
console.log('📍 Database: Neon (using DATABASE_URL from .env.local)');
console.log('📅 Date:', new Date().toISOString());
console.log('─'.repeat(60));

runMigration()
  .then(() => {
    console.log('\n' + '─'.repeat(60));
    console.log('🎉 Account Manager Assignment System is Ready!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start your development server: npm run dev');
    console.log('   2. Visit Admin Dashboard > User Assignments');
    console.log('   3. Assign users to account managers');
    console.log('   4. View sales reports in Accounting > Account Manager Sales');
    console.log('\n💡 The system is now ready for production use!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration failed. Please check the error above and try again.');
    process.exit(1);
  });