import { NextResponse } from 'next/server';
import { requireSuperAdmin, getAllPermissions } from '@/lib/rbac';

// GET /api/admin/rbac/permissions - Get all permissions
export async function GET() {
  try {
    await requireSuperAdmin();
    
    const permissionsData = await getAllPermissions();
    
    return NextResponse.json({
      success: true,
      data: permissionsData
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
      { success: false, error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

