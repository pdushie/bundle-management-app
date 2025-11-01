"use client";

import { useSession } from "next-auth/react";
import { Shield, ExternalLink, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRealtimeUpdates } from "../hooks/useRealtimeUpdates";

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

  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  return { permissions, loading, hasPermission };
}

export default function AdminDashboardLink() {
  const { data: session } = useSession();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [isVisible, setIsVisible] = useState(false);
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(true);
  
  // Use SSE for realtime updates instead of polling - don't wait for permissions to load
  const { unreadChatCount, chatConnectionStatus } = useRealtimeUpdates({
    enabled: true // Always enabled, will handle permissions internally
  });
  

  
  // Animation effect on mount
  useEffect(() => {
    // Delay appearance for a smoother experience
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Setup window focus detection
  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true);
    };
    
    const handleBlur = () => {
      setIsWindowFocused(false);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);


  
  // Only show the link for users with admin, super_admin, or standard_admin role
  if (!session?.user?.role || (session.user.role !== "admin" && session.user.role !== "super_admin" && session.user.role !== "standard_admin")) {
    return null;
  }

  // Don't show during permissions loading
  if (permissionsLoading) {
    return null;
  }
  
  return (
    <div className={`fixed bottom-6 right-6 z-40 transition-all duration-500 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
    }`}>
      <div className="relative">
        <Link 
          href="/admin"
          prefetch={true}
          className={`flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 ${
            hasPermission('admin.chat') && unreadChatCount > 0 ? 'ring-2 ring-red-400 ring-opacity-75 animate-pulse' : ''
          }`}
          title={
            hasPermission('admin.chat') && unreadChatCount > 0 
              ? `Access Admin Dashboard - ${unreadChatCount} unread message${unreadChatCount !== 1 ? 's' : ''}` 
              : (session.user.role === "super_admin" ? "Access Admin Dashboard (Super Admin)" : 
                 session.user.role === "standard_admin" ? "Access Admin Dashboard (Standard Admin)" : "Access Admin Dashboard")
          }
        >
          <Shield className="h-5 w-5" />
          <span className="font-medium hidden sm:inline">Admin Dashboard</span>
          <span className="font-medium sm:hidden">Admin</span>
          <ExternalLink className="h-4 w-4" />
        </Link>
        
        {/* Chat Notification Badge - only show for users with chat permissions */}
        {hasPermission('admin.chat') && unreadChatCount > 0 && (
          <div className="absolute -top-2 -right-2 flex items-center justify-center">
            <div className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-lg ring-2 ring-white animate-pulse">
              {unreadChatCount > 99 ? '99+' : unreadChatCount}
            </div>
            <div className="absolute inset-0 bg-red-400 rounded-full animate-ping"></div>
          </div>
        )}
        
        {/* Chat Icon Indicator (subtle) - only show for users with chat permissions */}
        {hasPermission('admin.chat') && unreadChatCount > 0 && (
          <div className="absolute -top-1 -left-1 bg-blue-500 rounded-full w-3 h-3 flex items-center justify-center">
            <MessageCircle className="h-2 w-2 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

