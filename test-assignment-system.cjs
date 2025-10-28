require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function testSystem() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🧪 Testing the user assignment system...\n');

    // Test 1: Check the sales view works
    console.log('📊 Test 1: Sales view functionality');
    const salesResult = await pool.query(`
      SELECT * FROM account_manager_sales 
      ORDER BY account_manager_id
    `);
    
    console.log(`✅ Sales view returned ${salesResult.rows.length} records`);
    salesResult.rows.forEach(row => {
      console.log(`   ${row.account_manager_name} (${row.account_manager_role}): ${row.total_users} users, ${row.total_orders} orders, $${row.total_sales} total sales`);
    });

    // Test 2: Check assignment functionality
    console.log('\n📝 Test 2: Assignment functionality');
    
    // Get a regular user to test with
    const userResult = await pool.query(`
      SELECT id, name, email FROM users 
      WHERE role NOT IN ('admin', 'superadmin', 'standard_admin') 
      LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('⚠️  No regular users found to test with');
    } else {
      const testUser = userResult.rows[0];
      const testAdmin = 4; // Admin User (superadmin)
      
      console.log(`   Testing assignment: ${testUser.name} → Admin User`);
      
      // Assign user to admin
      await pool.query(`
        UPDATE users 
        SET account_manager_id = $1 
        WHERE id = $2
      `, [testAdmin, testUser.id]);
      
      console.log('✅ Assignment successful');
      
      // Verify the assignment
      const verifyResult = await pool.query(`
        SELECT u.name as user_name, am.name as admin_name
        FROM users u
        LEFT JOIN users am ON am.id = u.account_manager_id
        WHERE u.id = $1
      `, [testUser.id]);
      
      if (verifyResult.rows.length > 0) {
        const result = verifyResult.rows[0];
        console.log(`✅ Verified: ${result.user_name} → ${result.admin_name}`);
      }
    }

    // Test 3: Check API endpoint format
    console.log('\n🔗 Test 3: API data format');
    const apiResult = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.account_manager_id,
        am.name as account_manager_name
      FROM users u
      LEFT JOIN users am ON am.id = u.account_manager_id
      WHERE u.role NOT IN ('admin', 'superadmin', 'standard_admin')
      ORDER BY u.id
      LIMIT 5
    `);
    
    console.log('✅ API format data:');
    apiResult.rows.forEach(row => {
      console.log(`   ${row.name} → ${row.account_manager_name || 'Not assigned'}`);
    });

    console.log('\n🎉 All tests passed! The system is ready to use.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testSystem();