'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import RBACManagement from '@/components/RBACManagement';

// Hook to check RBAC permissions
function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchPermissions = async () => {
      const userId = (session?.user as any)?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/admin/rbac/users/${userId}/permissions`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const permissionNames = data.permissions.map((p: any) => p.name);
            setPermissions(permissionNames);
          }
        }
      } catch (error) {
        // Console statement removed for security
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [(session?.user as any)?.id]);

  const hasAnyPermission = (permissionList: string[]) => {
    return permissionList.some(permission => permissions.includes(permission));
  };

  return { permissions, loading, hasAnyPermission };
}

export default function AdminRBACPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { permissions, loading: permissionsLoading, hasAnyPermission } = usePermissions();

  useEffect(() => {
    if (status === 'loading' || permissionsLoading) return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Check if user has RBAC permissions or is super_admin
    const userRole = session.user?.role;
    const hasRBACAccess = userRole === 'super_admin' || 
      hasAnyPermission(['rbac.roles.read', 'rbac.roles.manage', 'rbac.permissions.read', 'rbac.users.manage']);
    
    if (!hasRBACAccess) {
      router.push('/admin');
      return;
    }
  }, [session, status, router, permissionsLoading, hasAnyPermission]);

  if (status === 'loading' || permissionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700">Loading RBAC management...</p>
        </div>
      </div>
    );
  }

  // Check authorization again for rendering
  const userRole = session?.user?.role;
  const hasRBACAccess = userRole === 'super_admin' || 
    hasAnyPermission(['rbac.roles.read', 'rbac.roles.manage', 'rbac.permissions.read', 'rbac.users.manage']);

  if (!session || !hasRBACAccess) {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">RBAC Management</h1>
        <p className="text-gray-600">
          Manage roles, permissions, and user access control for the application.
        </p>
      </div>

      {/* RBAC Management Component */}
      <RBACManagement />
    </div>
  );
}

