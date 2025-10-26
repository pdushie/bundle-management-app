import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/rbac';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// GET /api/admin/rbac/users - Get all users for RBAC management
export async function GET() {
  try {
    await requireSuperAdmin();
    
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }
    
    const usersData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(users.name);
    
    return NextResponse.json({
      success: true,
      data: usersData.map(user => ({
        ...user,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Authentication required') || error.message.includes('Super admin access required')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized access' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}