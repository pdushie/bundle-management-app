"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { Users, Check, X, Clock, MessageCircle, Shield, Calendar, ArrowLeft, Database, User, LogOut, DollarSign } from "lucide-react";
import UserManagement from "@/components/UserManagement";
import PricingProfiles from "@/components/PricingProfiles";

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

export default function AdminDashboard() {
  const { data: session, status } = useSession() as any;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'pricing'>('pending');
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
    // Redirect unauthenticated users
    if (status === "unauthenticated") {
      redirect("/");
    }
    
    // Redirect regular admin users to announcements page
    if (session && session.user?.role === 'admin') {
      router.push('/admin/announcements');
    }
    
    // Regular users get redirected to home
    if (session && session.user?.role !== 'superadmin' && session.user?.role !== 'admin') {
      redirect("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      fetchPendingUsers();
      fetchUserStats();
    }
  }, [session]);

  const fetchPendingUsers = async () => {
    try {
      const response = await fetch('/api/admin/pending-users');
      if (response.ok) {
        const data = await response.json();
        setPendingUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch pending users:', error);
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
      console.error('Failed to fetch user stats:', error);
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
      console.error('Failed to approve user:', error);
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
      console.error('Failed to reject user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || (session.user?.role !== 'superadmin' && session.user?.role !== 'admin')) {
    return null;
  }
  
  // For admin users, we redirect them to the announcements page (handled in useEffect)
  if (session.user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700">Redirecting to announcements...</p>
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
            onClick={() => router.push('/admin/update-entry-costs')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200"
          >
            <Database className="w-4 h-4" />
            Update All Order Pricing
          </button>
        </div>
        
        {/* Enhanced Stats */}
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

        {/* Admin Dashboard Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-6">
          <div className="flex border-b border-gray-200">
            <button 
              onClick={() => setActiveTab('pending')} 
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
            
            <button 
              onClick={() => setActiveTab('users')} 
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'users' 
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Users className="w-4 h-4" />
              User Management
            </button>
            
            <button 
              onClick={() => setActiveTab('pricing')} 
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'pricing' 
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Pricing Profiles
            </button>
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
        ) : (
          // Pricing Profiles Tab Content
          <PricingProfiles />
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
