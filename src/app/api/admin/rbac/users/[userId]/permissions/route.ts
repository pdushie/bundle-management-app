import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  permissions,
  rolePermissions,
  userRoles
} from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const requestingUserId = (session.user as any).id;

    // Console log removed for security

    // Only allow users to fetch their own permissions or allow admin roles to fetch any
    if (parseInt(userId) !== parseInt(requestingUserId) && 
        session.user.role !== 'super_admin' && 
        session.user.role !== 'admin' && 
        session.user.role !== 'standard_admin') {
      // Console log removed for security
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Console log removed for security

    // Get user's permissions through their roles
    if (!db) {
      // Console log removed for security
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    // Console log removed for security
    
    const userPermissions = await db
      .select({
        name: permissions.name,
        description: permissions.description
      })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, parseInt(userId)))
      .groupBy(permissions.id, permissions.name, permissions.description);

    // Console log removed for security

    return NextResponse.json({
      success: true,
      permissions: userPermissions
    });

  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user permissions' },
      { status: 500 }
    );
  }
}