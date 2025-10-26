require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function runRBACMigration() {
  try {
    console.log('🚀 Starting RBAC migration...');
    
    // Check for DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not defined');
      console.log('Please set your DATABASE_URL in your environment variables or .env file');
      process.exit(1);
    }
    
    console.log('✅ Database connection configured');
    
    // Create Neon client
    const sql = neon(process.env.DATABASE_URL);
    
    // Create roles table
    console.log('📊 Creating roles table...');
    await sql`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        is_system_role BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      )
    `;

    // Create permissions table
    console.log('🔑 Creating permissions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        display_name VARCHAR(150) NOT NULL,
        description TEXT,
        resource VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(resource, action)
      )
    `;

    // Create role_permissions junction table
    console.log('🔗 Creating role_permissions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        granted_by INTEGER REFERENCES users(id),
        UNIQUE(role_id, permission_id)
      )
    `;

    // Create user_roles junction table
    console.log('👥 Creating user_roles table...');
    await sql`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_by INTEGER REFERENCES users(id),
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        UNIQUE(user_id, role_id)
      )
    `;

    // Insert default roles
    console.log('👑 Creating default roles...');
    const roles = [
      ['super_admin', 'Super Administrator', 'Full system access with role management capabilities', true],
      ['admin', 'Administrator', 'Administrative access to most system features', true],
      ['user', 'Standard User', 'Basic user access to personal features', true],
      ['viewer', 'Viewer', 'Read-only access to limited system features', true]
    ];

    for (const [name, displayName, description, isSystem] of roles) {
      await sql`
        INSERT INTO roles (name, display_name, description, is_system_role) 
        VALUES (${name}, ${displayName}, ${description}, ${isSystem})
        ON CONFLICT (name) DO NOTHING
      `;
    }

    // Insert system permissions
    console.log('🔐 Creating system permissions...');
    const permissions = [
      // User management
      ['users.create', 'Create Users', 'users', 'create', 'Create new user accounts'],
      ['users.read', 'View Users', 'users', 'read', 'View user information and lists'],
      ['users.update', 'Update Users', 'users', 'update', 'Modify user account information'],
      ['users.delete', 'Delete Users', 'users', 'delete', 'Remove user accounts from the system'],
      ['users.manage', 'Manage Users', 'users', 'manage', 'Full user management capabilities'],

      // Order management
      ['orders.create', 'Create Orders', 'orders', 'create', 'Create new orders'],
      ['orders.read', 'View Orders', 'orders', 'read', 'View order information and history'],
      ['orders.update', 'Update Orders', 'orders', 'update', 'Modify order details and status'],
      ['orders.delete', 'Delete Orders', 'orders', 'delete', 'Remove orders from the system'],
      ['orders.manage', 'Manage Orders', 'orders', 'manage', 'Full order management capabilities'],
      ['orders.process', 'Process Orders', 'orders', 'process', 'Process and fulfill orders'],

      // Admin functions
      ['admin.dashboard', 'Admin Dashboard', 'admin', 'read', 'Access to administrative dashboard'],
      ['admin.reports', 'Admin Reports', 'admin', 'read', 'Access to system reports and analytics'],
      ['admin.settings', 'Admin Settings', 'admin', 'update', 'Modify system settings and configuration'],
      ['admin.announcements', 'Manage Announcements', 'admin', 'manage', 'Create and manage system announcements'],
      ['admin.chat', 'Admin Chat', 'admin', 'manage', 'Access to admin chat system'],

      // Billing and financial
      ['billing.read', 'View Billing', 'billing', 'read', 'View billing information and invoices'],
      ['billing.manage', 'Manage Billing', 'billing', 'manage', 'Full billing and payment management'],
      ['pricing.read', 'View Pricing', 'pricing', 'read', 'View pricing information'],
      ['pricing.manage', 'Manage Pricing', 'pricing', 'manage', 'Modify pricing and cost structures'],

      // RBAC system (super admin only)
      ['rbac.roles.read', 'View Roles', 'rbac', 'read', 'View role definitions and assignments'],
      ['rbac.roles.manage', 'Manage Roles', 'rbac', 'manage', 'Create, modify, and delete roles'],
      ['rbac.permissions.read', 'View Permissions', 'rbac', 'read', 'View system permissions'],
      ['rbac.users.manage', 'Manage User Roles', 'rbac', 'manage', 'Assign and remove user roles'],

      // System features
      ['system.notifications', 'System Notifications', 'system', 'read', 'Access to system notifications'],
      ['system.history', 'System History', 'system', 'read', 'Access to system audit logs and history']
    ];

    for (const [name, displayName, resource, action, description] of permissions) {
      await sql`
        INSERT INTO permissions (name, display_name, resource, action, description) 
        VALUES (${name}, ${displayName}, ${resource}, ${action}, ${description})
        ON CONFLICT (name) DO NOTHING
      `;
    }

    // Assign permissions to roles
    console.log('🎯 Assigning permissions to roles...');
    
    // Super Admin gets all permissions
    await sql`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id 
      FROM roles r, permissions p 
      WHERE r.name = 'super_admin'
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `;

    // Admin gets most permissions except RBAC management
    await sql`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id 
      FROM roles r, permissions p 
      WHERE r.name = 'admin' AND p.resource != 'rbac'
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `;

    // Standard user gets basic permissions
    const userPermissions = [
      'orders.read', 'orders.create', 'billing.read', 'pricing.read', 'system.notifications'
    ];
    
    for (const permName of userPermissions) {
      await sql`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id 
        FROM roles r, permissions p 
        WHERE r.name = 'user' AND p.name = ${permName}
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `;
    }

    // Viewer gets read-only permissions
    const viewerPermissions = [
      'orders.read', 'billing.read', 'pricing.read'
    ];
    
    for (const permName of viewerPermissions) {
      await sql`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id 
        FROM roles r, permissions p 
        WHERE r.name = 'viewer' AND p.name = ${permName}
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `;
    }

    console.log('✅ RBAC migration completed successfully!');
    console.log('📊 Tables created: roles, permissions, role_permissions, user_roles');
    console.log('👑 Default roles: super_admin, admin, user, viewer');
    console.log('🔑 System permissions configured with proper assignments');
    console.log('');
    console.log('🎉 Your RBAC system is now ready!');
    console.log('📌 Next steps:');
    console.log('   1. Assign a super_admin role to your admin user');
    console.log('   2. Access the RBAC management at /admin/rbac');
    console.log('   3. Start assigning roles to users');
    
  } catch (error) {
    console.error('❌ RBAC migration failed:', error);
    console.error('Error details:', error.message);
    if (error.message.includes('DATABASE_URL')) {
      console.log('💡 Tip: Make sure your DATABASE_URL environment variable is set correctly');
    }
    process.exit(1);
  }
}

// Run the migration
runRBACMigration();