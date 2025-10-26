-- Add new RBAC tables to the existing schema

-- Roles table: Define different roles in the system
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_system_role BOOLEAN DEFAULT false NOT NULL, -- System roles cannot be deleted
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Permissions table: Define what actions can be performed
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL, -- e.g., 'orders', 'users', 'admin', 'billing'
    action VARCHAR(50) NOT NULL,   -- e.g., 'create', 'read', 'update', 'delete', 'manage'
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Role permissions: Many-to-many relationship between roles and permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT NOW(),
    granted_by INTEGER REFERENCES users(id),
    UNIQUE(role_id, permission_id)
);

-- User roles: Many-to-many relationship between users and roles (users can have multiple roles)
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by INTEGER REFERENCES users(id),
    expires_at TIMESTAMP NULL, -- Optional expiration for temporary role assignments
    is_active BOOLEAN DEFAULT true NOT NULL,
    UNIQUE(user_id, role_id)
);

-- Insert default system roles
INSERT INTO roles (name, display_name, description, is_system_role) VALUES
('super_admin', 'Super Administrator', 'Full system access including role management', true),
('admin', 'Administrator', 'Administrative access to most features', true),
('user', 'User', 'Standard user access', true),
('viewer', 'Viewer', 'Read-only access', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, display_name, description, resource, action) VALUES
-- User management
('users.create', 'Create Users', 'Create new user accounts', 'users', 'create'),
('users.read', 'View Users', 'View user information', 'users', 'read'),
('users.update', 'Update Users', 'Update user information', 'users', 'update'),
('users.delete', 'Delete Users', 'Delete user accounts', 'users', 'delete'),
('users.approve', 'Approve Users', 'Approve pending user registrations', 'users', 'approve'),
('users.manage_roles', 'Manage User Roles', 'Assign and remove user roles', 'users', 'manage_roles'),

-- Role management (Super Admin only)
('roles.create', 'Create Roles', 'Create new system roles', 'roles', 'create'),
('roles.read', 'View Roles', 'View system roles and permissions', 'roles', 'read'),
('roles.update', 'Update Roles', 'Update role information and permissions', 'roles', 'update'),
('roles.delete', 'Delete Roles', 'Delete non-system roles', 'roles', 'delete'),
('roles.manage_permissions', 'Manage Role Permissions', 'Assign and remove role permissions', 'roles', 'manage_permissions'),

-- Order management
('orders.create', 'Create Orders', 'Create new orders', 'orders', 'create'),
('orders.read', 'View Orders', 'View orders', 'orders', 'read'),
('orders.update', 'Update Orders', 'Update order information', 'orders', 'update'),
('orders.delete', 'Delete Orders', 'Delete orders', 'orders', 'delete'),
('orders.process', 'Process Orders', 'Mark orders as processed', 'orders', 'process'),
('orders.track', 'Track Orders', 'View order tracking information', 'orders', 'track'),

-- Bundle allocator
('bundles.create', 'Create Bundles', 'Use bundle allocator feature', 'bundles', 'create'),
('bundles.read', 'View Bundles', 'View bundle allocation history', 'bundles', 'read'),

-- Admin features
('admin.dashboard', 'Admin Dashboard', 'Access admin dashboard', 'admin', 'dashboard'),
('admin.announcements', 'Manage Announcements', 'Create and manage system announcements', 'admin', 'announcements'),
('admin.chat', 'Admin Chat', 'Access administrative chat features', 'admin', 'chat'),
('admin.accounting', 'Accounting Reports', 'View accounting and billing reports', 'admin', 'accounting'),
('admin.pricing', 'Pricing Management', 'Manage pricing profiles and settings', 'admin', 'pricing'),
('admin.otp', 'OTP Settings', 'Manage OTP authentication settings', 'admin', 'otp'),

-- Billing
('billing.read', 'View Billing', 'View billing information', 'billing', 'read'),
('billing.export', 'Export Billing', 'Export billing reports', 'billing', 'export'),

-- History
('history.read', 'View History', 'View processing history', 'history', 'read'),
('history.clear', 'Clear History', 'Clear processing history', 'history', 'clear')

ON CONFLICT (name) DO NOTHING;

-- Assign permissions to default roles
-- Super Admin gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 1
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin gets most permissions except role management
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 1
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin' 
AND p.resource != 'roles'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- User gets basic permissions
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 1
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'user' 
AND p.name IN (
    'orders.create', 'orders.read', 'orders.track',
    'bundles.create', 'bundles.read',
    'billing.read',
    'history.read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Viewer gets only read permissions
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, 1
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'viewer' 
AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);