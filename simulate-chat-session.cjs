require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const neonClient = neon(process.env.DATABASE_URL);

async function simulateSessionCheck() {
  console.log('Simulating session and permission check...');
  
  try {
    // Test users that should have chat access
    const testUsers = [
      { id: 11, email: 'mayopia4u@gmail.com', role: 'standard_admin' },
      { id: 18, email: 'clickyfiedmaster@gmail.com', role: 'standard_admin' }
    ];
    
    for (const user of testUsers) {
      console.log(`\n=== Testing User: ${user.email} (ID: ${user.id}) ===`);
      
      // Check user exists and is active
      const userCheck = await neonClient`
        SELECT id, email, role, status, is_active 
        FROM users 
        WHERE id = ${user.id}
      `;
      
      console.log('User data:', userCheck[0]);
      
      // Check chat permission (exact same query as the page)
      const permissionResult = await neonClient`
        SELECT p.name 
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = ${user.id} AND p.name = 'admin.chat' AND ur.is_active = true
      `;
      
      console.log(`Chat permission check result:`, permissionResult);
      console.log(`Has chat permission: ${permissionResult.length > 0}`);
      
      // Check RBAC roles
      const roles = await neonClient`
        SELECT r.name as role_name, ur.is_active
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = ${user.id}
      `;
      
      console.log('RBAC roles:', roles);
      
      // Simulate the session object that would be created
      const simulatedSession = {
        user: {
          id: user.id,
          email: user.email,
          role: user.role // This comes from the legacy role column
        }
      };
      
      console.log('Simulated session:', simulatedSession);
      
      // Check what would happen in the page logic
      const userId = simulatedSession.user.id;
      const isSuperAdmin = simulatedSession.user.role === 'super_admin';
      const hasChatPermission = permissionResult.length > 0;
      
      console.log(`Session check results:`);
      console.log(`- userId: ${userId}`);
      console.log(`- isSuperAdmin: ${isSuperAdmin}`);
      console.log(`- hasChatPermission: ${hasChatPermission}`);
      console.log(`- Would allow access: ${isSuperAdmin || hasChatPermission}`);
    }
    
  } catch (error) {
    console.error('Error in simulation:', error);
  }
}

simulateSessionCheck();