"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Cache for RBAC permissions to reduce API calls
const permissionsCache = new Map<string, { permissions: string[], timestamp: number }>();
const PERMISSIONS_CACHE_DURATION = 300000; // 5 minutes

// Hook to check RBAC permissions with caching
export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchPermissions = async () => {
      const userId = (session?.user as any)?.id;
      const userRole = (session?.user as any)?.role;
      
      if (!userId) {
        setLoading(false);
        return;
      }

      // Check cache first
      const cached = permissionsCache.get(userId);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < PERMISSIONS_CACHE_DURATION) {
        setPermissions(cached.permissions);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/admin/rbac/users/${userId}/permissions`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success) {
            const permissionNames = data.permissions.map((p: any) => p.name);
            
            // Cache the permissions
            permissionsCache.set(userId, {
              permissions: permissionNames,
              timestamp: now
            });
            
            setPermissions(permissionNames);
          }
        } else {
          // Console statement removed for security
        }
      } catch (error) {
        // Console statement removed for security
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [(session?.user as any)?.id]);

  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: string[]) => {
    return permissionList.some(permission => permissions.includes(permission));
  };

  return { permissions, loading, hasPermission, hasAnyPermission };
}