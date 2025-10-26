import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/rbac';
import { db } from '@/lib/db';
import { roles, rolePermissions } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/admin/rbac/roles/[id] - Get specific role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    
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
    
    const role = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    
    if (role.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: role[0]
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Super admin access required')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized access' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch role' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/rbac/roles/[id] - Update role
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
    const { name, displayName, description, permissionIds, isActive } = body;
    
    if (!displayName) {
      return NextResponse.json(
        { success: false, error: 'Display name is required' },
        { status: 400 }
      );
    }
    
    // Check if role exists and is not a system role
    const existingRole = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    
    if (existingRole.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }
    
    // Allow editing of system roles for super admins
    // if (existingRole[0].isSystemRole) {
    //   return NextResponse.json(
    //     { success: false, error: 'Cannot modify system roles' },
    //     { status: 403 }
    //   );
    // }
    
    // Check if new name conflicts with existing role (if name is being changed)
    if (name && name !== existingRole[0].name) {
      const nameConflict = await db
        .select()
        .from(roles)
        .where(and(eq(roles.name, name), eq(roles.id, roleId)))
        .limit(1);
      
      if (nameConflict.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Role name already exists' },
          { status: 400 }
        );
      }
    }
    
    // Update the role
    const updateData: any = {
      displayName,
      description: description || null,
      updatedAt: new Date(),
    };
    
    if (name && name !== existingRole[0].name) {
      updateData.name = name;
    }
    
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }
    
    const [updatedRole] = await db
      .update(roles)
      .set(updateData)
      .where(eq(roles.id, roleId))
      .returning();
    
    // Update permissions if provided
    if (permissionIds && Array.isArray(permissionIds)) {
      // Remove existing permissions
      await db
        .delete(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));
      
      // Add new permissions
      if (permissionIds.length > 0) {
        const permissionEntries = permissionIds.map((permissionId: number) => ({
          roleId: roleId,
          permissionId,
          grantedAt: new Date(),
          grantedBy: userId,
        }));
        
        await db
          .insert(rolePermissions)
          .values(permissionEntries);
      }
    }
    
    return NextResponse.json({
      success: true,
      data: updatedRole
    });
  } catch (error) {
    console.error('Error updating role:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Super admin access required')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized access' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update role' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/rbac/roles/[id] - Delete role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    
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
    
    // Check if role exists and is not a system role
    const existingRole = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    
    if (existingRole.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }
    
    // Allow deletion of system roles for super admins
    // if (existingRole[0].isSystemRole) {
    //   return NextResponse.json(
    //     { success: false, error: 'Cannot delete system roles' },
    //     { status: 403 }
    //   );
    // }
    
    // Delete role permissions first
    await db
      .delete(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));
    
    // Delete the role
    await db
      .delete(roles)
      .where(eq(roles.id, roleId));
    
    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Super admin access required')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized access' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete role' },
      { status: 500 }
    );
  }
}