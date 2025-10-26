# Data Processor Role Implementation

## Overview
Successfully implemented a new `data_processor` role with limited access to specific data processing and order management functionality.

## Role Permissions
The `data_processor` role has access to the following permissions:

### Bundle Management
- `bundles.create` - Use bundle allocator feature
- `bundles.read` - View bundle allocation history

### Data Processing
- `data.categorize` - Access data categorization features

### Order Management
- `orders.create` - Create new orders
- `orders.read` - View orders
- `orders.update` - Update order information
- `orders.process` - Mark orders as processed
- `orders.track` - View order tracking information

### History
- `history.read` - View processing history

## Accessible Features
Users with the `data_processor` role can access:

1. **Bundle Allocator** - Process phone data using bundle allocation
2. **Bundle Categorizer** - Categorize data packages
3. **Orders** - View and manage orders
4. **Processed Orders** - View orders that have been processed
5. **Track Orders** - Track order status and information

## Restricted Features  
Data processors **cannot** access:

- User Management (create/update users, roles)
- RBAC Management (role and permission management)
- Pricing Management (pricing profiles, settings)
- Administrative Settings (OTP, announcements)
- Accounting Reports (except data categorizer)
- History & Analytics (full admin history)
- Chat System

## Implementation Details

### Database Changes
1. **New Role**: Created `data_processor` role in the `roles` table
2. **New Permission**: Added `data.categorize` permission for data categorization
3. **Role Permissions**: Assigned appropriate permissions to the role

### Code Changes

#### Authentication & Authorization
- **`src/lib/auth.ts`**: Updated `getPrimaryRole()` hierarchy and `requireAdmin()` function
- **`src/middleware.ts`**: Added `data_processor` to admin role checks
- **API Endpoints**: Updated relevant APIs to allow `data_processor` access

#### Frontend Access Control
- **`src/app/page.tsx`**: 
  - Added `isDataProcessor` role check
  - Updated tab filtering logic for data processor access
  - Updated component rendering logic to allow access to authorized features

#### API Authorization
Updated the following endpoints to include `data_processor`:
- `/api/admin/stats` - For basic order statistics
- `/api/admin/accounting/data-categorizer` - For data categorization features

## Files Created/Modified

### Migration Files
- `migrations/add-data-processor-role.sql` - Database migration script
- `migrations/api-updates-for-data-processor.sql` - API update documentation

### Code Files Modified
- `src/lib/auth.ts` - Role hierarchy and admin checks
- `src/middleware.ts` - Route protection
- `src/app/page.tsx` - Frontend role-based access control
- `src/app/api/admin/stats/route.ts` - Statistics API authorization
- `src/app/api/admin/accounting/data-categorizer/route.ts` - Data categorizer API

### Debug/Testing Files
- `src/app/api/debug/data-processor-role/route.ts` - Role testing endpoint

## Setup Instructions

1. **Run the Migration**:
   Execute the SQL in `migrations/add-data-processor-role.sql` against your database to create the role and permissions.

2. **Assign the Role**:
   Use the RBAC management interface to assign the `data_processor` role to appropriate users.

3. **Test the Implementation**:
   - Login as a user with the `data_processor` role
   - Verify access to: Bundle Allocator, Bundle Categorizer, Orders, Processed Orders, Track Orders
   - Verify NO access to: User Management, RBAC, Pricing, Admin Settings, Full Accounting

## Role Hierarchy
The role hierarchy is now:
1. `super_admin` (highest privileges)
2. `admin` 
3. `standard_admin`
4. `data_processor` (limited data processing access)
5. `user`
6. `viewer` (lowest privileges)

## Security Considerations
- Data processors have no access to user management or system administration
- They cannot modify roles, permissions, or pricing
- Access is limited to data processing and order management functions only
- All API endpoints maintain proper authorization checks

## Testing
Use the debug endpoint `/api/debug/data-processor-role` to verify role permissions and access controls are working correctly.