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

    console.log('Permissions API: userId:', userId, 'requestingUserId:', requestingUserId, 'userRole:', session.user.role);

    // Only allow users to fetch their own permissions or allow admin roles to fetch any
    if (parseInt(userId) !== parseInt(requestingUserId) && 
        session.user.role !== 'super_admin' && 
        session.user.role !== 'admin' && 
        session.user.role !== 'standard_admin') {
      console.log('Permissions API: Access denied - userId mismatch or not admin role');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('Permissions API: Access granted, fetching permissions for user:', userId);

    // Get user's permissions through their roles
    if (!db) {
      console.log('Permissions API: Database connection not available');
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    console.log('Permissions API: Querying permissions for user ID:', parseInt(userId));
    
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

    console.log('Permissions API: Found permissions:', userPermissions);

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