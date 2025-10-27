import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, getUserRoles } from '@/lib/rbac';
import { db } from '@/lib/db';
import { userRoles, users } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/admin/rbac/users/[userId]/roles - Get roles for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireSuperAdmin();
    
    const { userId: userIdParam } = await params;
    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    const roles = await getUserRoles(userId);
    
    return NextResponse.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Super admin access required')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized access' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user roles' },
      { status: 500 }
    );
  }
}

// POST /api/admin/rbac/users/[userId]/roles - Assign role to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: adminId } = await requireSuperAdmin();
    
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    const { userId: userIdParam } = await params;
    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { roleId, expiresAt } = body;
    
    if (!roleId) {
      return NextResponse.json(
        { success: false, error: 'Role ID is required' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (user.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if role assignment already exists (active or inactive)
    const existingAssignment = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, roleId)
        )
      )
      .limit(1);
    
    let assignment;
    
    if (existingAssignment.length > 0) {
      // If assignment exists but is inactive, reactivate it
      if (!existingAssignment[0].isActive) {
        [assignment] = await db
          .update(userRoles)
          .set({
            isActive: true,
            assignedAt: new Date(),
            assignedBy: adminId,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
          })
          .where(eq(userRoles.id, existingAssignment[0].id))
          .returning();
      } else {
        // Already has active role
        return NextResponse.json(
          { success: false, error: 'User already has this role assigned' },
          { status: 400 }
        );
      }
    } else {
      // Create new role assignment
      [assignment] = await db
        .insert(userRoles)
        .values({
          userId,
          roleId,
          assignedAt: new Date(),
          assignedBy: adminId,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          isActive: true,
        })
        .returning();
    }
    
    return NextResponse.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Error assigning role:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Super admin access required')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized access' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to assign role' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/rbac/users/[userId]/roles - Remove role from user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireSuperAdmin();
    
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    const { userId: userIdParam } = await params;
    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const roleId = parseInt(searchParams.get('roleId') || '');
    
    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, error: 'Valid role ID is required' },
        { status: 400 }
      );
    }
    
    // Deactivate role assignment
    await db
      .update(userRoles)
      .set({ 
        isActive: false
      })
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, roleId),
          eq(userRoles.isActive, true)
        )
      );
    
    return NextResponse.json({
      success: true,
      message: 'Role removed successfully'
    });
  } catch (error) {
    console.error('Error removing role:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Super admin access required')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized access' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to remove role' },
      { status: 500 }
    );
  }
}