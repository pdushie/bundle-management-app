-- Add data_processor role and required permissions
-- This role should have access only to:
-- - Bundle Allocator
-- - Bundle Categorizer  
-- - Orders
-- - Processed Orders
-- - Track Orders

-- First, let's add any missing permissions that data_processor might need
INSERT INTO permissions (name, display_name, description, resource, action) VALUES
('data.categorize', 'Data Categorization', 'Access data categorization features', 'data', 'categorize')
ON CONFLICT (name) DO NOTHING;

-- Create data_processor role
INSERT INTO roles (name, display_name, description, is_active, is_system_role)
VALUES ('data_processor', 'Data Processor', 'Role for users who process and categorize data, manage orders, and track order status', true, false)
ON CONFLICT (name) DO NOTHING;

-- Get the role ID for data_processor
DO $$
DECLARE
    data_processor_role_id INTEGER;
    permission_record RECORD;
BEGIN
    -- Get the data_processor role ID
    SELECT id INTO data_processor_role_id FROM roles WHERE name = 'data_processor';
    
    -- Assign specific permissions to data_processor role
    -- Bundle allocator permissions
    FOR permission_record IN 
        SELECT id FROM permissions WHERE name IN ('bundles.create', 'bundles.read')
    LOOP
        INSERT INTO role_permissions (role_id, permission_id, granted_by)
        VALUES (data_processor_role_id, permission_record.id, 1)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
    
    -- Data categorization permissions
    FOR permission_record IN 
        SELECT id FROM permissions WHERE name = 'data.categorize'
    LOOP
        INSERT INTO role_permissions (role_id, permission_id, granted_by)
        VALUES (data_processor_role_id, permission_record.id, 1)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
    
    -- Order management permissions (create, read, update, process, track)
    FOR permission_record IN 
        SELECT id FROM permissions WHERE name IN (
            'orders.create', 
            'orders.read', 
            'orders.update', 
            'orders.process', 
            'orders.track'
        )
    LOOP
        INSERT INTO role_permissions (role_id, permission_id, granted_by)
        VALUES (data_processor_role_id, permission_record.id, 1)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
    
    -- History read permission (for viewing processing history)
    FOR permission_record IN 
        SELECT id FROM permissions WHERE name = 'history.read'
    LOOP
        INSERT INTO role_permissions (role_id, permission_id, granted_by)
        VALUES (data_processor_role_id, permission_record.id, 1)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Successfully created data_processor role and assigned permissions';
END $$;

-- Verify the permissions were assigned correctly
SELECT 
    r.name as role_name,
    r.display_name as role_display_name,
    p.name as permission_name,
    p.display_name as permission_display_name,
    p.resource,
    p.action
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'data_processor'
ORDER BY p.resource, p.action;