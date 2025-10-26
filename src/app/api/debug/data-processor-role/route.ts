import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userRole = session.user.role || 'user';
    const isDataProcessor = userRole === 'data_processor';
    const isAdmin = ['admin', 'standard_admin', 'super_admin'].includes(userRole);
    const isSuperAdmin = userRole === 'super_admin';

    const accessInfo = {
      userId: (session.user as any).id,
      userRole: userRole,
      checks: {
        isDataProcessor,
        isAdmin,
        isSuperAdmin,
        canAccessBundleAllocator: isDataProcessor || isAdmin || isSuperAdmin,
        canAccessBundleCategorizer: isDataProcessor || isAdmin || isSuperAdmin,
        canAccessOrders: isDataProcessor || isAdmin || isSuperAdmin,
        canAccessProcessedOrders: isDataProcessor || isAdmin || isSuperAdmin,
        canAccessTrackOrders: isDataProcessor || isAdmin || isSuperAdmin,
        canAccessHistory: isAdmin || isSuperAdmin, // data_processor should NOT have access
        canAccessAccounting: isAdmin || isSuperAdmin, // data_processor should NOT have access
        canAccessRBAC: isSuperAdmin, // Only super_admin
        canAccessUserManagement: isAdmin || isSuperAdmin, // data_processor should NOT have access
      },
      allowedTabs: [] as string[]
    };

    // Determine allowed tabs based on role
    const allTabs = [
      'bundle-allocator',
      'bundle-categorizer', 
      'orders',
      'processed-orders',
      'track-orders',
      'history',
      'accounting',
      'send-order',
      'sent-orders',
      'packages',
      'billing'
    ];

    for (const tab of allTabs) {
      let hasAccess = false;

      switch (tab) {
        case 'bundle-allocator':
        case 'bundle-categorizer':
        case 'orders':
        case 'processed-orders':
        case 'track-orders':
          hasAccess = isDataProcessor || isAdmin || isSuperAdmin;
          break;
        case 'history':
        case 'accounting':
          hasAccess = isAdmin || isSuperAdmin;
          break;
        case 'send-order':
        case 'sent-orders':
        case 'packages':
        case 'billing':
          hasAccess = userRole === 'user' || isSuperAdmin;
          break;
      }

      if (hasAccess) {
        accessInfo.allowedTabs.push(tab);
      }
    }

    return NextResponse.json(accessInfo);
  } catch (error) {
    console.error('Error in debug role API:', error);
    return NextResponse.json(
      { error: 'Failed to debug role information' },
      { status: 500 }
    );
  }
}