"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Shield, Users, DollarSign, UserCheck, Settings, Bell, MessageSquare, ArrowLeft, Package, FileBox, Eye, BarChart } from 'lucide-react';
import AdminChatNotifier from '@/components/admin/AdminChatNotifier';
import AdminOTPStatusIndicator from '@/components/admin/AdminOTPStatusIndicator';

// Hook to check RBAC permissions
function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchPermissions = async () => {
      const userId = (session?.user as any)?.id;
      const userRole = (session?.user as any)?.role;
      console.log('Fetching permissions for user:', { userId, userRole });
      
      if (!userId) {
        console.log('No userId found, setting loading to false');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/admin/rbac/users/${userId}/permissions`);
        console.log('Permissions API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Permissions API response:', data);
          
          if (data.success) {
            const permissionNames = data.permissions.map((p: any) => p.name);
            console.log('Setting permissions:', permissionNames);
            setPermissions(permissionNames);
          }
        } else {
          console.error('Permissions API failed with status:', response.status);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
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

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const [unreadCount, setUnreadCount] = useState(0);
  const { permissions, loading: permissionsLoading, hasPermission, hasAnyPermission } = usePermissions();
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  // Fetch unread message count for the navigation badge
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'standard_admin' && session.user.role !== 'super_admin')) {
        return;
      }
      
      try {
        const response = await fetch('/api/chat/unread');
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data.success) {
              setUnreadCount(data.unreadCount);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };
    
    fetchUnreadCount();
    
    // Poll every 3 minutes (reduced to lower function invocations)
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    }, 180000); // 3 minutes
    
    return () => clearInterval(intervalId);
  }, [session]);
  
  // Show loading state while permissions are being fetched
  if (permissionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {/* Left side - Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-700">System Management</p>
              </div>
            </div>

            {/* Right side - OTP Status and Back to app button */}
            <div className="flex items-center gap-3">
              {/* OTP Status Indicator - visible to both admin and superadmin */}
              <AdminOTPStatusIndicator />
              
              <Link
                href="/"
                className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Application
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Admin Navigation */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-4">
            {/* Show User Management link to users with user permissions or legacy roles */}
            {(hasAnyPermission(['users.read', 'users.create', 'users.update', 'users.delete', 'users.manage']) || userRole === 'admin' || userRole === 'standard_admin' || userRole === 'super_admin') && (
              <Link
                href="/admin"
                className={`px-3 py-4 text-sm font-medium ${
                  isActive('/admin')
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-900 hover:text-blue-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  User Management
                </span>
              </Link>
            )}
            
            {/* Show Pricing Management link to users with pricing permissions or legacy roles */}
            {(hasAnyPermission(['pricing.read', 'pricing.manage', 'pricing:create', 'pricing:update', 'pricing:delete']) || userRole === 'admin' || userRole === 'standard_admin' || userRole === 'super_admin') && (
              <Link
                href="/admin/pricing"
                className={`px-3 py-4 text-sm font-medium ${
                  isActive('/admin/pricing')
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-900 hover:text-blue-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Pricing Management
                </span>
              </Link>
            )}
            
            {/* Show RBAC Management link to users with RBAC permissions or super_admin */}
            {(hasAnyPermission(['rbac.roles.read', 'rbac.roles.manage', 'rbac.permissions.read', 'rbac.users.manage']) || userRole === 'super_admin') && (
              <Link
                href="/admin/rbac"
                className={`px-3 py-4 text-sm font-medium ${
                  isActive('/admin/rbac')
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-900 hover:text-blue-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  RBAC Management
                </span>
              </Link>
            )}
            
            {/* Show OTP Settings link to super_admin or users with system admin permissions */}
            {(userRole === 'super_admin' || hasPermission('system:admin')) && (
              <Link
                href="/admin/otp-settings"
                className={`px-3 py-4 text-sm font-medium ${
                  isActive('/admin/otp-settings')
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-900 hover:text-blue-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  OTP Settings
                </span>
              </Link>
            )}
            
            {/* Show System Settings link to super_admin only */}
            {userRole === 'super_admin' && (
              <Link
                href="/admin/system-settings"
                className={`px-3 py-4 text-sm font-medium ${
                  isActive('/admin/system-settings')
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-900 hover:text-blue-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  System Settings
                </span>
              </Link>
            )}
            
            {/* Show Announcements link to users with announcements permissions or super_admin role only */}
            {(hasAnyPermission(['admin.announcements']) || userRole === 'super_admin') && (
            <Link
              href="/admin/announcements"
              className={`px-3 py-4 text-sm font-medium ${
                isActive('/admin/announcements')
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-900 hover:text-blue-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Announcements
              </span>
            </Link>
            )}
            
            {/* Moderator-specific navigation links */}
            {/* Show Bundle Allocator link to moderators */}
            {(hasPermission('bundles:allocator') || userRole === 'moderator') && (
            <Link
              href="/?tab=bundle-allocator"
              className={`px-3 py-4 text-sm font-medium ${
                pathname.startsWith('/?tab=bundle-allocator')
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-900 hover:text-blue-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Bundle Allocator
              </span>
            </Link>
            )}
            
            {/* Show Bundle Categorizer link to moderators */}
            {(hasPermission('bundles:categorizer') || userRole === 'moderator') && (
            <Link
              href="/?tab=bundle-categorizer"
              className={`px-3 py-4 text-sm font-medium ${
                pathname.startsWith('/?tab=bundle-categorizer')
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-900 hover:text-blue-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileBox className="w-4 h-4" />
                Bundle Categorizer
              </span>
            </Link>
            )}
            
            {/* Show Orders link to moderators */}
            {(hasPermission('orders:view') || userRole === 'moderator') && (
            <Link
              href="/?tab=orders"
              className={`px-3 py-4 text-sm font-medium ${
                pathname.startsWith('/?tab=orders')
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-900 hover:text-blue-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileBox className="w-4 h-4" />
                Orders
              </span>
            </Link>
            )}
            
            {/* Show Processed Orders link to moderators */}
            {(hasPermission('orders:processed:view') || userRole === 'moderator') && (
            <Link
              href="/?tab=processed-orders"
              className={`px-3 py-4 text-sm font-medium ${
                pathname.startsWith('/?tab=processed-orders')
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-900 hover:text-blue-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Processed Orders
              </span>
            </Link>
            )}
            
            {/* Show Order Tracking link to moderators */}
            {(hasPermission('orders:track') || userRole === 'moderator') && (
            <Link
              href="/?tab=track-orders"
              className={`px-3 py-4 text-sm font-medium ${
                pathname.startsWith('/?tab=track-orders')
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-900 hover:text-blue-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Track Orders
              </span>
            </Link>
            )}
            
            {/* Show Chat link to users with chat permissions or super_admin role only */}
            {(hasAnyPermission(['admin.chat']) || userRole === 'super_admin') && (
            <Link
              href="/admin/chat"
              className={`px-3 py-4 text-sm font-medium ${
                isActive('/admin/chat')
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-900 hover:text-blue-600'
              }`}
            >
              <span className="flex items-center gap-2 relative">
                <MessageSquare className="w-4 h-4" />
                Chat Support
                {unreadCount > 0 && !isActive('/admin/chat') && (
                  <span className="absolute -top-2 -right-6 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
            </Link>
            )}
          </nav>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
      
      {/* Chat notifications */}
      <AdminChatNotifier />
    </div>
  );
}
