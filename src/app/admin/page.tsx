"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Shield, ArrowLeft, User, LogOut } from "lucide-react";

export default function AdminDashboard() {
  const { data: session, status } = useSession() as any;
  const router = useRouter();

  // Show loading while session is loading
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

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    router.push("/");
    return null;
  }

  // Show access denied for non-admin users
  if (!session?.user || !['super_admin', 'superadmin', 'admin', 'standard_admin'].includes(session?.user?.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700">Access denied - Admin access required</p>
        </div>
      </div>
    );
  }

  // Main dashboard content
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
                onClick={() => router.push('/')}
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
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
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

        {/* Simple Admin Message */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8 text-center">
            <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Dashboard</h2>
            <p className="text-gray-700 mb-6">Welcome to the admin dashboard. You have administrative access.</p>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800">User: {session?.user?.name || session?.user?.email}</p>
                <p className="text-blue-800">Role: {session?.user?.role}</p>
              </div>
              <p className="text-sm text-gray-600">This is a simplified admin dashboard to avoid React hooks issues.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


