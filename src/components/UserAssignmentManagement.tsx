"use client";

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Filter, Check, X, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  account_manager_id: string | null;
  account_manager_name: string | null;
  account_manager_email: string | null;
  created_at: string;
}

interface AccountManager {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function UserAssignmentManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [accountManagers, setAccountManagers] = useState<AccountManager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedAccountManager, setSelectedAccountManager] = useState<string>('unassign');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUserAssignments();
  }, []);

  const fetchUserAssignments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/user-assignments');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user assignments');
      }
      
      const data = await response.json();
      setUsers(data.users);
      setAccountManagers(data.accountManagers);
    } catch (error) {
      console.error('Error fetching user assignments:', error);
      setErrorMessage('Failed to load user assignments. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignUsers = async () => {
    if (selectedUsers.length === 0) {
      setErrorMessage('Please select at least one user');
      return;
    }

    try {
      setIsAssigning(true);
      setErrorMessage(null);
      
      const response = await fetch('/api/admin/user-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: selectedUsers,
          accountManagerId: selectedAccountManager === 'unassign' ? null : selectedAccountManager || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign users');
      }

      const result = await response.json();
      setSuccessMessage(result.message);
      setSelectedUsers([]);
      setSelectedAccountManager('unassign');
      setShowAssignmentModal(false);
      
      // Refresh the data
      await fetchUserAssignments();
    } catch (error) {
      console.error('Error assigning users:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to assign users');
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const toggleRowExpansion = (userId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesAssignment = assignmentFilter === 'all' ||
                             (assignmentFilter === 'assigned' && user.account_manager_id) ||
                             (assignmentFilter === 'unassigned' && !user.account_manager_id);
    
    return matchesSearch && matchesRole && matchesAssignment;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'standard_admin': return 'bg-cyan-100 text-cyan-800';
      case 'user': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading user assignments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-blue-600" />
            User Assignment Management
          </CardTitle>
          <CardDescription>
            Assign users to account managers for sales tracking and performance reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="standard_admin">Standard Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>

            <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium">
                {selectedUsers.length > 0 
                  ? `${selectedUsers.length} user(s) selected`
                  : 'Select users for bulk assignment'
                }
              </span>
            </div>
            
            {selectedUsers.length > 0 && (
              <Button 
                onClick={() => setShowAssignmentModal(true)}
                className="text-sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Selected Users
              </Button>
            )}
          </div>

          {/* Error/Success Messages */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
              {errorMessage}
            </div>
          )}
          
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md border border-green-200">
              {successMessage}
            </div>
          )}

          {/* Users Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-700">
                    <Checkbox
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left p-4 font-medium text-gray-700">User</th>
                  <th className="text-left p-4 font-medium text-gray-700">Role</th>
                  <th className="text-left p-4 font-medium text-gray-700">Status</th>
                  <th className="text-left p-4 font-medium text-gray-700">Account Manager</th>
                  <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map(user => (
                  <React.Fragment key={user.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="p-4">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-700">{user.email}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusBadgeColor(user.status)}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {user.account_manager_name ? (
                          <div>
                            <div className="font-medium text-gray-900">{user.account_manager_name}</div>
                            <div className="text-sm text-gray-700">{user.account_manager_email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(user.id)}
                        >
                          {expandedRows.has(user.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                    {expandedRows.has(user.id) && (
                      <tr>
                        <td colSpan={6} className="p-4 bg-gray-50">
                          <div className="text-sm text-gray-700 space-y-2">
                            <div><strong>User ID:</strong> {user.id}</div>
                            <div><strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}</div>
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedUsers([user.id]);
                                  setShowAssignmentModal(true);
                                }}
                              >
                                Change Assignment
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-gray-700">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p>No users found matching your filters.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Assign Users to Account Manager
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                Selected users: {selectedUsers.length}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Manager
                  </label>
                  <Select 
                    value={selectedAccountManager} 
                    onValueChange={setSelectedAccountManager}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account manager or leave blank to unassign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassign">No Assignment (Remove)</SelectItem>
                      {accountManagers.map(manager => (
                        <SelectItem key={manager.id} value={manager.id}>
                          <div className="flex flex-col">
                            <span>{manager.name}</span>
                            <span className="text-xs text-gray-700">{manager.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAssignmentModal(false);
                    setSelectedAccountManager('unassign');
                    setErrorMessage(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignUsers}
                  disabled={isAssigning}
                  className="flex-1"
                >
                  {isAssigning ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Assign Users
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}