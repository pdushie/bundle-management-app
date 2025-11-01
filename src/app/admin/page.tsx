"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Users, Check, X, Clock, MessageCircle, Shield, Calendar, ArrowLeft, Database, User, LogOut, DollarSign, Settings, Receipt } from "lucide-react";

// Hook to check RBAC permissions
function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchPermissions = async () => {
      const userId = (session?.user as any)?.id;
      // Console log removed for security
      if (!userId) {
        // Console log removed for security
        setLoading(false);
        return;
      }

      try {
        // AdminDashboard: Making request to permissions API - logging removed for security
        const response = await fetch(`/api/admin/rbac/users/${userId}/permissions`);
        // AdminDashboard: Permission API response status - logging removed for security
        if (response.ok) {
          const data = await response.json();
          // AdminDashboard: Permission API response data - logging removed for security
          if (data.success) {
            const permissionNames = data.permissions.map((p: any) => p.name);
            // Console log removed for security
            setPermissions(permissionNames);
          }
        } else {
          // AdminDashboard: Permission API request failed - logging removed for security
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
import UserManagement from "@/components/UserManagement";
import PricingProfiles from "@/components/PricingProfiles";
import MinimumEntriesAdmin from "@/components/admin/MinimumEntriesAdmin";
import AdminOrdersDashboard from "@/components/AdminOrdersDashboard";
import UserAssignmentManagement from "@/components/UserAssignmentManagement";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useRouter as useNextRouter } from 'next/navigation';

interface PendingUser {
  id: string;
  name: string;
  email: string;
  request_message: string;
  created_at: string;
}

interface UserStats {
  totalUsers: number;
  approvedCount: number;
  rejectedCount: number;
  adminCount: number;
}

function AdminDashboardContent() {
  const { data: session, status } = useSession() as any;
  const router = useRouter();
  const { permissions, loading: permissionsLoading, hasPermission, hasAnyPermission } = usePermissions();
  
  // Helper function to check if user is admin
  const isAdminRole = (role: string | undefined) => {
    return role === 'super_admin' || role === 'superadmin' || role === 'admin' || role === 'standard_admin';
  };
  
  // Set default tab based on user role and permissions
  const getDefaultTab = () => {
    if (session?.user?.role === 'super_admin' || session?.user?.role === 'superadmin') {
      return 'pending';
    }
    // For users with user management permissions, default to pending tab
    if (hasAnyPermission(['users:create', 'users:update']) || isAdminRole(session?.user?.role)) {
      return 'pending';
    }
    // Otherwise default to users tab if they have user permissions
    if (hasAnyPermission(['users:view'])) {
      return 'users';
    }
    // Otherwise default to pricing if they have pricing permissions
    if (hasAnyPermission(['pricing:view', 'pricing:create', 'pricing:update', 'pricing:delete'])) {
      return 'pricing';
    }
    // Fallback to users
    return 'users';
  };
  
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'pricing' | 'minimum-entries' | 'assignments' | 'orders' | 'accounting'>('users');
  const [userHasSelectedTab, setUserHasSelectedTab] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    approvedCount: 0,
    rejectedCount: 0,
    adminCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  // Function to go back to the main application
  const goBackToApplication = () => {
    router.push('/');
  };

  // Handle sign out
  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/signin" });
  };

  useEffect(() => {
    // Console log removed for security
    
    // Redirect unauthenticated users
    if (status === "unauthenticated") {
      // Console log removed for security
      router.push("/");
      return;
    }
    
    // For non-admin users, check if they have permissions to access admin dashboard
    if (session && !isAdminRole(session.user?.role) && !permissionsLoading) {
      const hasAdminPermissions = hasAnyPermission([
        'users:view', 'users:create', 'users:update', 'users:delete',
        'pricing:view', 'pricing:create', 'pricing:update', 'pricing:delete'
      ]);
      
      const hasAnnouncementsPermission = hasAnyPermission(['admin.announcements']);
      const hasChatPermission = hasAnyPermission(['admin.chat']);
      
      // Console log removed for security
      
      // If they have announcements permission but not general admin permissions, redirect to announcements
      if (!hasAdminPermissions && hasAnnouncementsPermission) {
        // Console log removed for security
        router.push('/admin/announcements');
        return;
      }
      
      // If they have chat permission but not general admin permissions, redirect to chat
      if (!hasAdminPermissions && hasChatPermission) {
        // Console log removed for security
        router.push('/admin/chat');
        return;
      }
      
      // If they don't have any admin permissions, redirect to home
      if (!hasAdminPermissions && !hasAnnouncementsPermission && !hasChatPermission) {
        // Console log removed for security
        router.push("/");
        return;
      }
    }
    
    // Regular users get redirected to home
    if (session && !isAdminRole(session.user?.role)) {
      // Console log removed for security
      router.push("/");
      return;
    }
  }, [status, session, router, permissionsLoading, hasAnyPermission, permissions]);

  useEffect(() => {
    if (isAdminRole(session?.user?.role) || hasAnyPermission(['users:create', 'users:update'])) {
      fetchPendingUsers();
      fetchUserStats();
    }
  }, [session, hasAnyPermission]);
  
  // Update default tab when permissions are loaded (only if user hasn't manually selected a tab)
  useEffect(() => {
    if (!permissionsLoading && session && !userHasSelectedTab) {
      const defaultTab = getDefaultTab();
      // Console log removed for security
      // Only set the default tab if user hasn't manually selected one
      if (defaultTab !== activeTab) {
        setActiveTab(defaultTab as 'pending' | 'users' | 'pricing' | 'minimum-entries' | 'orders' | 'accounting');
      }
    }
  }, [permissionsLoading, session, hasAnyPermission, userHasSelectedTab]);

  const fetchPendingUsers = async () => {
    try {
      const response = await fetch('/api/admin/pending-users');
      if (response.ok) {
        const data = await response.json();
        setPendingUsers(data.users);
      }
    } catch (error) {
      // Console statement removed for security
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setUserStats({
          totalUsers: data.totalUsers,
          approvedCount: data.approvedCount,
          rejectedCount: data.rejectedCount,
          adminCount: data.adminCount
        });
      }
    } catch (error) {
      // Console statement removed for security
    }
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        setPendingUsers(prev => prev.filter(user => user.id !== userId));
        // Refresh stats after approval
        fetchUserStats();
      }
    } catch (error) {
      // Console statement removed for security
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch('/api/admin/reject-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason: rejectionReason }),
      });

      if (response.ok) {
        setPendingUsers(prev => prev.filter(user => user.id !== userId));
        setShowRejectModal(null);
        setRejectionReason("");
        // Refresh stats after rejection
        fetchUserStats();
      }
    } catch (error) {
      // Console statement removed for security
    } finally {
      setActionLoading(null);
    }
  };

  // Check if user has permission to access admin dashboard
  const hasAdminAccess = session && (isAdminRole(session?.user?.role) ||
    hasAnyPermission([
      'users:view', 'users:create', 'users:update', 'users:delete',
      'pricing:view', 'pricing:create', 'pricing:update', 'pricing:delete'
    ]));

  // Show loading state without early return to avoid hook order issues
  if (status === "loading" || permissionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show access denied without early return to avoid hook order issues  
  if (!session || !hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header with Back Button and User Menu */}
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
                <p className="text-sm text-gray-700">Manage user access requests</p>
              </div>
            </div>

            {/* Right side - Navigation and User Menu */}
            <div className="flex items-center gap-4 text-sm">
              {/* Back to Application Button */}
              <button
                onClick={goBackToApplication}
                className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Application
              </button>

              {/* User Menu */}
              <div className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-full">
                <User className="w-4 h-4" />
                <span className="font-medium">{session?.user?.name || session?.user?.email}</span>
                <button
                  onClick={handleSignOut}
                  className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Admin Quick Actions */}
        <div className="flex justify-end mb-6">
          <button
            disabled
            className="flex items-center gap-2 bg-gray-400 text-gray-200 px-4 py-2 rounded-lg cursor-not-allowed transition-all duration-200"
          >
            <Database className="w-4 h-4" />
            Update All Order Pricing
          </button>
        </div>
        
        {/* Enhanced Stats - Show for users with user management permissions */}
        {(session?.user?.role === 'super_admin' || session?.user?.role === 'admin' || session?.user?.role === 'standard_admin' || hasAnyPermission(['users:create', 'users:update'])) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-700 font-medium">Pending Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingUsers.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-700 font-medium">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Check className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-700 font-medium">Approved Users</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.approvedCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-700 font-medium">Admins</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.adminCount}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Dashboard Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-6">
          <div className="flex border-b border-gray-200">
        {/* Show Pending Requests tab to users with user management permissions */}
        {(isAdminRole(session?.user?.role) || hasAnyPermission(['users:create', 'users:update'])) && (
              <button 
                onClick={() => { setActiveTab('pending'); setUserHasSelectedTab(true); }} 
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'pending' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Clock className="w-4 h-4" />
                Pending Requests
                {pendingUsers.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {pendingUsers.length}
                  </span>
                )}
              </button>
            )}
            
        {/* Show User Management tab to users with user permissions or admin roles */}
        {(hasAnyPermission(['users:view', 'users:create', 'users:update', 'users:delete']) || isAdminRole(session?.user?.role)) && (
              <button 
                onClick={() => { setActiveTab('users'); setUserHasSelectedTab(true); }} 
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'users' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Users className="w-4 h-4" />
                User Management
              </button>
            )}
            
        {/* Show Pricing Profiles tab to users with pricing permissions or admin roles */}
        {(hasAnyPermission(['pricing:view', 'pricing:create', 'pricing:update', 'pricing:delete']) || isAdminRole(session?.user?.role)) && (
              <button 
                onClick={() => { setActiveTab('pricing'); setUserHasSelectedTab(true); }} 
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'pricing' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Pricing Profiles
              </button>
            )}
            
        {/* Show Minimum Entries tab to users with minimum entries permissions or admin roles */}
        {(hasAnyPermission(['admin:minimum_entries']) || isAdminRole(session?.user?.role)) && (
              <button 
                onClick={() => { setActiveTab('minimum-entries'); setUserHasSelectedTab(true); }} 
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'minimum-entries' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Settings className="w-4 h-4" />
                Minimum Entries
              </button>
            )}
            
        {/* Show User Assignments tab to users with user permissions or admin roles */}
        {(hasAnyPermission(['users:view', 'users:update']) || isAdminRole(session?.user?.role)) && (
              <button 
                onClick={() => { setActiveTab('assignments'); setUserHasSelectedTab(true); }} 
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'assignments' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Users className="w-4 h-4" />
                User Assignments
              </button>
            )}
            
        {/* Show Order Reports tab to users with order permissions or admin roles */}
        {(hasAnyPermission(['admin:orders']) || isAdminRole(session?.user?.role)) && (
              <button 
                onClick={() => { setActiveTab('orders'); setUserHasSelectedTab(true); }} 
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'orders' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Database className="w-4 h-4" />
                Order Reports
              </button>
            )}
            
        {/* Show Accounting tab to admin roles */}
        {isAdminRole(session?.user?.role) && (
              <button 
                onClick={() => { setActiveTab('accounting'); setUserHasSelectedTab(true); }} 
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'accounting' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Receipt className="w-4 h-4" />
                Accounting
              </button>
            )}
          </div>
        </div>

        {activeTab === 'pending' ? (
          // Pending Users Tab Content
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600" />
                Pending Access Requests
              </h2>
              <p className="text-sm text-gray-700 mt-1">
                Review and approve or reject user access requests
              </p>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-700">Loading pending requests...</p>
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
                <p className="text-gray-700">All access requests have been processed.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-gray-100 rounded-full">
                            <Users className="w-4 h-4 text-gray-700" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{user.name}</h3>
                            <p className="text-sm text-gray-700">{user.email}</p>
                          </div>
                        </div>
                        
                        {user.request_message && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-start gap-2">
                              <MessageCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-blue-800 mb-1">Request Message:</p>
                                <p className="text-sm text-blue-700">{user.request_message}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-700">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Requested {new Date(user.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            {(user as any).email_verified ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                ✓ Email Verified
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                ⚠ Email Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleApprove(user.id)}
                          disabled={actionLoading === user.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === user.id ? (
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Approve
                        </button>
                        
                        <button
                          onClick={() => setShowRejectModal(user.id)}
                          disabled={actionLoading === user.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'users' ? (
          // User Management Tab Content
          <UserManagement />
        ) : activeTab === 'pricing' ? (
          // Pricing Profiles Tab Content
          <ErrorBoundary>
            <PricingProfiles />
          </ErrorBoundary>
        ) : activeTab === 'minimum-entries' ? (
          // Minimum Entries Tab Content
          <ErrorBoundary>
            <MinimumEntriesAdmin />
          </ErrorBoundary>
        ) : activeTab === 'assignments' ? (
          // User Assignments Tab Content
          <ErrorBoundary>
            <UserAssignmentManagement />
          </ErrorBoundary>
        ) : activeTab === 'accounting' ? (
          // Accounting Tab - Redirect to dedicated page
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-6 text-center">
              <Receipt className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-4">Accounting Dashboard</h2>
              <p className="text-gray-700 mb-6">Access comprehensive accounting features including user billing and account manager sales reporting.</p>
              <button
                onClick={() => router.push('/admin/accounting')}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Receipt className="w-4 h-4" />
                Open Accounting Dashboard
              </button>
            </div>
          </div>
        ) : (
          // Order Reports Tab Content
          <ErrorBoundary>
            <AdminOrdersDashboard />
          </ErrorBoundary>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Reject Access Request</h3>
              <p className="text-sm text-gray-700 mb-4">
                Provide a reason for rejecting this access request (optional):
              </p>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                placeholder="Reason for rejection..."
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectionReason("");
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => showRejectModal && handleReject(showRejectModal)}
                  disabled={actionLoading === showRejectModal}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === showRejectModal ? (
                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Reject Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { data: session, status } = useSession() as any;
  const { loading: permissionsLoading } = usePermissions();

  // Show loading state - this component always calls the same hooks
  if (status === "loading" || permissionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  // If we get here, we can render the main content
  return <AdminDashboardContent />;
}


