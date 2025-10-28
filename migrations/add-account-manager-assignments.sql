-- Add account manager assignment functionality to users table
-- This migration adds support for assigning users to account managers

-- Add account_manager_id column to users table
ALTER TABLE "users" 
ADD COLUMN "account_manager_id" varchar REFERENCES "users" ("id") ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX idx_users_account_manager_id ON "users" ("account_manager_id");
CREATE INDEX idx_users_role ON "users" ("role");

-- Create a view for easy account manager reporting
CREATE OR REPLACE VIEW "account_manager_sales" AS 
SELECT 
    am.id as account_manager_id,
    am.name as account_manager_name,
    am.email as account_manager_email,
    am.role as account_manager_role,
    COUNT(DISTINCT u.id) as assigned_users_count,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.cost), 0) as total_sales,
    COALESCE(SUM(o.estimated_cost), 0) as total_estimated_sales,
    COALESCE(SUM(o.total_data), 0) as total_data_gb
FROM "users" am
LEFT JOIN "users" u ON u.account_manager_id = am.id
LEFT JOIN "orders" o ON o.user_id = u.id
WHERE am.role IN ('admin', 'standard_admin', 'super_admin')
GROUP BY am.id, am.name, am.email, am.role;

-- Comments for documentation
COMMENT ON COLUMN "users"."account_manager_id" IS 'References the admin/account manager responsible for this user';
COMMENT ON VIEW "account_manager_sales" IS 'Aggregated sales data by account manager for reporting purposes';