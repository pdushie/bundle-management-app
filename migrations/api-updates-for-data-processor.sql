-- Script to update API endpoints to include data_processor role for relevant functionalities
-- This updates endpoints that data_processor should have access to based on their role permissions

-- These API endpoints should be updated to include 'data_processor' in their authorization:

-- 1. Order-related APIs (since data_processor has orders.* permissions)
-- src/app/api/admin/stats/route.ts - for viewing basic stats related to orders
-- No direct update needed for admin/orders/route.ts as it only checks authentication

-- 2. Data categorization APIs (since data_processor has data.categorize permission)
-- src/app/api/admin/accounting/data-categorizer/route.ts - already includes standard_admin, should include data_processor

-- Note: The following files need manual updates to include 'data_processor' in role checks:

-- File: src/app/api/admin/stats/route.ts
-- Current: ["super_admin", "admin", "standard_admin"]
-- Should be: ["super_admin", "admin", "standard_admin", "data_processor"]

-- File: src/app/api/admin/accounting/data-categorizer/route.ts  
-- Current: session.user.role !== "admin" && session.user.role !== "super_admin" && session.user.role !== "standard_admin"
-- Should add: && session.user.role !== "data_processor"

-- The data_processor role should NOT have access to:
-- - User management APIs (users, create, update-role, etc.)
-- - RBAC management APIs  
-- - Pricing management APIs
-- - Administrative settings (OTP, announcements, etc.)
-- - Billing/accounting reports (except data categorizer)

SELECT 'API endpoints that need manual updates for data_processor role:' as message;
SELECT 'src/app/api/admin/stats/route.ts' as file, 'Add data_processor to role array' as change;
SELECT 'src/app/api/admin/accounting/data-categorizer/route.ts' as file, 'Add data_processor to role check' as change;