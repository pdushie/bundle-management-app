import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireSuperAdmin, getAllRoles, getAllPermissions } from '@/lib/rbac';
import { db } from '@/lib/db';
import { roles, permissions, rolePermissions } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/admin/rbac/roles - Get all roles
export async function GET() {
  try {
    // Check authentication first
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Allow super_admin, admin, or standard_admin roles
    // Later we can enhance this with specific permission checks
    const allowedRoles = ['super_admin', 'admin', 'standard_admin'];
    if (!allowedRoles.includes(session.user.role as string)) {
      console.log('Roles API: Access denied for role:', session.user.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    console.log('Roles API: Access granted for role:', session.user.role);
    const rolesData = await getAllRoles();
    
    return NextResponse.json({
      success: true,
      data: rolesData
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Super admin access required')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized access' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

// POST /api/admin/rbac/roles - Create new role
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSuperAdmin();
    
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    
    const { name, displayName, description, permissionIds } = body;
    
    if (!name || !displayName) {
      return NextResponse.json(
        { success: false, error: 'Name and display name are required' },
        { status: 400 }
      );
    }
    
    // Check if role name already exists
    const existingRole = await db
      .select()
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1);
    
    if (existingRole.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Role name already exists' },
        { status: 400 }
      );
    }
    
    // Create the role
    const [newRole] = await db
      .insert(roles)
      .values({
        name,
        displayName,
        description: description || null,
        isActive: true,
        isSystemRole: false,
        createdAt: new Date(),
        updatedAt: null,
      })
      .returning();
    
    // Assign permissions if provided
    if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
      const permissionEntries = permissionIds.map((permissionId: number) => ({
        roleId: newRole.id,
        permissionId,
        grantedAt: new Date(),
        grantedBy: userId,
      }));
      
      await db
        .insert(rolePermissions)
        .values(permissionEntries);
    }
    
    return NextResponse.json({
      success: true,
      data: newRole
    });
  } catch (error) {
    console.error('Error creating role:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Super admin access required')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized access' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create role' },
      { status: 500 }
    );
  }
}