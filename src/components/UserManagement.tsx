"use client";

import React, { useState, useEffect } from "react";
import { 
  User, 
  UserPlus, 
  Key, 
  ShieldCheck, 
  AlertCircle, 
  X, 
  Check, 
  ToggleLeft, 
  ToggleRight,
  DollarSign
} from "lucide-react";
import ManageUserPricing from "./ManageUserPricing";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login_at?: string;
}

interface RoleData {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  isSystemRole: boolean;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  
  // Fetch users and roles on component mount
  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);
  
  // Function to fetch users
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Add cache-busting parameter to ensure fresh data
      const response = await fetch(`/api/admin/users?_=${Date.now()}`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setUsers(data.users || []);
        } else {
          // Console statement removed for security
        }
      }
    } catch (error) {
      // Console statement removed for security
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to fetch RBAC roles
  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      const response = await fetch("/api/admin/rbac/roles");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter to only active roles
          const activeRoles = data.data.filter((role: RoleData) => role.isActive);
          setRoles(activeRoles);
        }
      }
    } catch (error) {
      // Console statement removed for security
    } finally {
      setRolesLoading(false);
    }
  };
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isUpdateRoleModalOpen, setIsUpdateRoleModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  
  // Create user form state
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: ""
  });
  
  // Set default role when roles are loaded
  useEffect(() => {
    if (roles.length > 0 && !newUser.role) {
      // Default to lowest privilege role or first role available
      const defaultRole = roles.find(r => r.name.includes('user') || r.name.includes('viewer')) || 
                         roles.sort((a, b) => a.displayName.localeCompare(b.displayName))[0];
      setNewUser(prev => ({ ...prev, role: defaultRole.name }));
    }
  }, [roles, newUser.role]);
  
  // Reset password form state
  const [newPassword, setNewPassword] = useState("");
  
  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle creating a new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }
      
      setSuccess("User created successfully");
      // Reset form
      const defaultRole = roles.find(r => r.name.includes('user') || r.name.includes('viewer')) || 
                         roles.sort((a, b) => a.displayName.localeCompare(b.displayName))[0];
      setNewUser({
        name: "",
        email: "",
        password: "",
        role: defaultRole ? defaultRole.name : ""
      });
      
      // Close modal after a short delay
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setSuccess(null);
        fetchUsers(); // Refresh user list
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle resetting user password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          newPassword
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }
      
      setSuccess("Password reset successfully");
      // Reset form
      setNewPassword("");
      
      // Close modal after a short delay
      setTimeout(() => {
        setIsResetPasswordModalOpen(false);
        setSelectedUser(null);
        setSuccess(null);
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle updating user role
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch("/api/admin/users/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          role: (document.getElementById("role-select") as HTMLSelectElement)?.value
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to update role");
      }
      
      if (data.isCurrentUser) {
        setSuccess("Your role has been updated successfully. You may need to refresh the page or log out and log back in to see the changes.");
      } else {
        setSuccess("User role updated successfully");
      }
      
      // Close modal after a longer delay if it's current user to let them read the message
      setTimeout(() => {
        setIsUpdateRoleModalOpen(false);
        setSelectedUser(null);
        setSuccess(null);
        fetchUsers(); // Refresh user list
        
        // If it's the current user, suggest page refresh
        if (data.isCurrentUser) {
          if (confirm("Your role has been changed. Would you like to refresh the page to apply the changes?")) {
            window.location.reload();
          }
        } else {
          // Force a more aggressive refresh for other users
          setTimeout(() => {
            fetchUsers();
          }, 500);
        }
      }, data.isCurrentUser ? 2000 : 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle toggling user status (enable/disable)
  const handleToggleStatus = async (user: UserData) => {
    // Check both status and is_active for proper enable/disable logic
    const isCurrentlyEnabled = user.status === "approved" && (user as any).is_active !== false;
    const isEnabling = !isCurrentlyEnabled;
    
    try {
      const response = await fetch("/api/admin/users/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          enabled: isEnabling
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${isEnabling ? "enable" : "disable"} user`);
      }
      
      // Refresh user list
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };
  
  // Get role badge color dynamically based on role hierarchy
  const getRoleBadgeColor = (roleName: string) => {
    const role = roles.find(r => r.name === roleName);
    if (!role) return "bg-gray-100 text-gray-700";
    
    // Assign colors based on role name patterns or hierarchy
    if (roleName.includes('super') || roleName.includes('root')) {
      return "bg-red-100 text-red-700";
    } else if (roleName.includes('admin')) {
      return "bg-purple-100 text-purple-700";
    } else if (roleName.includes('manager') || roleName.includes('moderator')) {
      return "bg-green-100 text-green-700";
    } else if (roleName.includes('viewer') || roleName.includes('read')) {
      return "bg-gray-100 text-gray-700";
    } else {
      return "bg-blue-100 text-blue-700";
    }
  };
  
  // Get status badge color
  const getStatusBadgeColor = (status: string, isActive: boolean = true) => {
    // If user is not active, always show as disabled
    if (!isActive || status === "disabled") {
      return "bg-red-100 text-red-700";
    }
    
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };
  
  // Format readable role name using RBAC data
  const formatRoleName = (roleName: string) => {
    const role = roles.find(r => r.name === roleName);
    return role ? role.displayName : roleName.charAt(0).toUpperCase() + roleName.slice(1);
  };

  return (
    <div>
      {/* Header with Create User Button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-700">Manage user accounts, roles, and access</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchUsers();
              fetchRoles();
            }}
            className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200"
            title="Refresh user list and roles"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 3V8H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 16V21H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 3.93C14.07 3.33 11.96 3.33 9.93998 4.07C7.91997 4.81 6.26997 6.27 5.19995 8.28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.8 15.71C17.73 17.72 16.08 19.18 14.06 19.92C12.04 20.66 9.93001 20.66 8.00001 20.06" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 21H21V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 3H3V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Refresh
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <UserPlus className="w-4 h-4" />
            Create User
          </button>
        </div>
      </div>
      
      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-700">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs sm:text-sm font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-700">
                      No users found
                    </td>
                  </tr>
                ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-700" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-700">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs sm:text-sm leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {formatRoleName(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs sm:text-sm leading-5 font-semibold rounded-full ${getStatusBadgeColor(user.status, user.is_active)}`}>
                      {!user.is_active || user.status === "disabled" ? "Disabled" : user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.email_verified ? (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          ⚠ Pending
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {user.last_login_at ? (
                      <div>
                        <div>{new Date(user.last_login_at).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(user.last_login_at).toLocaleTimeString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Never</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsResetPasswordModalOpen(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50"
                        title="Reset Password"
                      >
                        <Key className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsUpdateRoleModalOpen(true);
                        }}
                        className="text-amber-600 hover:text-amber-900 p-1 rounded-md hover:bg-amber-50"
                        title="Change Role"
                      >
                        <ShieldCheck className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsPricingModalOpen(true);
                        }}
                        className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-green-50"
                        title="Manage Pricing"
                      >
                        <DollarSign className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`${
                          user.status === "approved" && user.is_active !== false
                            ? "text-red-600 hover:text-red-900 hover:bg-red-50" 
                            : "text-green-600 hover:text-green-900 hover:bg-green-50"
                        } p-1 rounded-md`}
                        title={user.status === "approved" && user.is_active !== false ? "Disable User" : "Enable User"}
                      >
                        {user.status === "approved" && user.is_active !== false ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        )}
      </div>      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Create New User</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-gray-700 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              {success && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center">
                  <Check className="w-5 h-5 mr-2" />
                  <span>{success}</span>
                </div>
              )}
              
              <form onSubmit={handleCreateUser}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    />
                    <p className="text-xs sm:text-sm text-gray-700 mt-1">
                      Must be at least 8 characters long
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      required
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      disabled={rolesLoading}
                    >
                      {rolesLoading ? (
                        <option value="">Loading roles...</option>
                      ) : (
                        roles.map((role) => (
                          <option key={role.id} value={role.name}>
                            {role.displayName}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5 mr-2" />
                        Create User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Reset Password Modal */}
      {isResetPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Reset Password</h3>
                <button
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="text-gray-700 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-700 mb-4">
                Reset password for <span className="font-semibold">{selectedUser.name}</span> ({selectedUser.email})
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              {success && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center">
                  <Check className="w-5 h-5 mr-2" />
                  <span>{success}</span>
                </div>
              )}
              
              <form onSubmit={handleResetPassword}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <p className="text-xs text-gray-700 mt-1">
                    Must be at least 8 characters long
                  </p>
                </div>
                
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 transition-all duration-200 flex items-center justify-center"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <Key className="w-5 h-5 mr-2" />
                        Reset Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Update Role Modal */}
      {isUpdateRoleModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Update User Role</h3>
                <button
                  onClick={() => setIsUpdateRoleModalOpen(false)}
                  className="text-gray-700 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-700 mb-4">
                Change role for <span className="font-semibold">{selectedUser.name}</span> ({selectedUser.email})
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              {success && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center">
                  <Check className="w-5 h-5 mr-2" />
                  <span>{success}</span>
                </div>
              )}
              
              <form onSubmit={handleUpdateRole}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    id="role-select"
                    required
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={selectedUser.role}
                    disabled={rolesLoading}
                  >
                    {rolesLoading ? (
                      <option value="">Loading roles...</option>
                    ) : (
                      roles.map((role) => (
                        <option key={role.id} value={role.name}>
                          {role.displayName}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-all duration-200 flex items-center justify-center"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 mr-2" />
                        Update Role
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Pricing Modal */}
      {isPricingModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Manage User Pricing</h3>
                <button
                  onClick={() => setIsPricingModalOpen(false)}
                  className="text-gray-700 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <ManageUserPricing 
                userId={selectedUser.id}
                userName={selectedUser.name}
                userEmail={selectedUser.email}
                onClose={() => setIsPricingModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

