"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Users, Bell, ArrowLeft, Shield, MessageSquare } from 'lucide-react';
import AdminChatNotifier from '@/components/admin/AdminChatNotifier';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const [unreadCount, setUnreadCount] = useState(0);
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  // Fetch unread message count for the navigation badge
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
        return;
      }
      
      try {
        const response = await fetch('/api/chat/unread');
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUnreadCount(data.unreadCount);
          }
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };
    
    fetchUnreadCount();
    
    // Poll every 30 seconds
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [session]);
  
  // Redirect non-admin users attempting to access admin-only pages
  if (pathname !== '/admin/announcements' && pathname !== '/admin/chat' && userRole === 'admin') {
    // For admin users, redirect to announcements page if they try to access other admin pages
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/announcements';
    }
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
                <p className="text-sm text-gray-600">System Management</p>
              </div>
            </div>

            {/* Right side - Back to app button */}
            <div>
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
            {/* Only show User Management link to superadmins */}
            {userRole === 'superadmin' && (
              <Link
                href="/admin"
                className={`px-3 py-4 text-sm font-medium ${
                  isActive('/admin')
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-blue-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  User Management
                </span>
              </Link>
            )}
            
            {/* Show Announcements link to both admin and superadmin */}
            <Link
              href="/admin/announcements"
              className={`px-3 py-4 text-sm font-medium ${
                isActive('/admin/announcements')
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-blue-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Announcements
              </span>
            </Link>
            
            {/* Show Chat link to both admin and superadmin */}
            <Link
              href="/admin/chat"
              className={`px-3 py-4 text-sm font-medium ${
                isActive('/admin/chat')
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-blue-600'
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
