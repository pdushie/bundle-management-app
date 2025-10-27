import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, getRolePermissions } from '@/lib/rbac';
import { db } from '@/lib/db';
import { rolePermissions } from '@/lib/schema';
import { eq, and, inArray } from 'drizzle-orm';

// GET /api/admin/rbac/roles/[id]/permissions - Get permissions for a role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    
    const { id } = await params;
    const roleId = parseInt(id);
    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role ID' },
        { status: 400 }
      );
    }
    
    const permissions = await getRolePermissions(roleId);
    
    return NextResponse.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    // Console statement removed for security
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Super admin access required')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized access' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch role permissions' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/rbac/roles/[id]/permissions - Update permissions for a role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireSuperAdmin();
    
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    const { id } = await params;
    const roleId = parseInt(id);
    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { permissionIds } = body;
    
    if (!Array.isArray(permissionIds)) {
      return NextResponse.json(
        { success: false, error: 'Permission IDs must be an array' },
        { status: 400 }
      );
    }
    
    // Remove existing permissions for this role
    await db
      .delete(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));
    
    // Add new permissions
    if (permissionIds.length > 0) {
      const permissionEntries = permissionIds.map((permissionId: number) => ({
        roleId,
        permissionId,
        grantedAt: new Date(),
        grantedBy: userId,
      }));
      
      await db
        .insert(rolePermissions)
        .values(permissionEntries);
    }
    
    // Return updated permissions
    const updatedPermissions = await getRolePermissions(roleId);
    
    return NextResponse.json({
      success: true,
      data: updatedPermissions
    });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Super admin access required')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized access' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update role permissions' },
      { status: 500 }
    );
  }
}