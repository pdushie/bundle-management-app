"use client";

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PricingProfiles from '@/components/PricingProfiles';

export default function PricingManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Check if user has pricing permissions or is admin/standard_admin/super_admin
    const userRole = session.user?.role;
    if (!userRole || !['admin', 'standard_admin', 'super_admin'].includes(userRole)) {
      // Check RBAC permissions
      fetchUserPermissions();
    } else {
      setLoading(false);
    }
  }, [session, status, router]);

  const fetchUserPermissions = async () => {
    try {
      const userId = (session?.user as any)?.id;
      if (!userId) {
        router.push('/admin');
        return;
      }

      const response = await fetch(`/api/admin/rbac/users/${userId}/permissions`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const userPermissions = data.permissions.map((p: any) => p.name);
          setPermissions(userPermissions);
          
          // Check if user has any pricing permissions (using actual permission names from database)
          const hasPricingPermission = userPermissions.some((perm: string) => 
            perm.startsWith('pricing.') || perm.startsWith('pricing:')
          );
          
          if (!hasPricingPermission) {
            router.push('/admin');
            return;
          }
        }
      } else {
        router.push('/admin');
        return;
      }
    } catch (error) {
      // Console statement removed for security
      router.push('/admin');
      return;
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pricing Management</h1>
          <p className="text-gray-600 mt-2">
            Manage pricing profiles, tiers, and user assignments
          </p>
        </div>
      </div>

      <PricingProfiles />
    </div>
  );
}

