'use client';

import { useState } from 'react';
import '@/styles/rbac-select-fix.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Shield, Trash2, Search } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
}

interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

interface UserRole {
  id: number;
  userId: number;
  roleId: number;
  assignedAt: Date;
  assignedBy: number | null;
  expiresAt: Date | null;
  isActive: boolean;
  role?: Role;
}

interface UserRoleManagementProps {
  users: User[];
  roles: Role[];
  onUsersChange: (users: User[]) => void;
}

export function UserRoleManagement({ users, roles, onUsersChange }: UserRoleManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<Record<number, UserRole[]>>({});
  const [loadingRoles, setLoadingRoles] = useState<Record<number, boolean>>({});
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchUserRoles = async (userId: number) => {
    if (userRoles[userId] || loadingRoles[userId]) return;
    
    setLoadingRoles(prev => ({ ...prev, [userId]: true }));
    
    try {
      const response = await fetch(`/api/admin/rbac/users/${userId}/roles`);
      const data = await response.json();
      
      // Fetching roles for user - logging removed for security
      
      if (response.ok && data.success) {
        setUserRoles(prev => ({ ...prev, [userId]: data.data }));
      } else {
        // Console statement removed for security
      }
    } catch (error) {
      // Console statement removed for security
    } finally {
      setLoadingRoles(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRoleId) {
      // Console log removed for security
      return;
    }

    // Assigning role - logging removed for security

    try {
      const response = await fetch(`/api/admin/rbac/users/${selectedUser.id}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleId: parseInt(selectedRoleId),
        }),
      });

      const data = await response.json();
      // Console log removed for security

      if (response.ok && data.success) {
        // Refresh user roles
        setUserRoles(prev => {
          const updated = { ...prev };
          delete updated[selectedUser.id];
          return updated;
        });
        await fetchUserRoles(selectedUser.id);
        setIsAssignDialogOpen(false);
        setSelectedRoleId('');
        // Console log removed for security
        
        // Show success message
        alert('✅ Role assigned successfully!');
      } else {
        // Console statement removed for security
        
        // Handle specific error cases
        if (data.error?.includes('already has this role')) {
          alert('âš ï¸ User already has this role assigned.');
        } else if (response.status === 401) {
          alert('âŒ Unauthorized. You need super admin access to assign roles.');
        } else if (response.status === 404) {
          alert('âŒ User not found.');
        } else {
          alert(`âŒ Failed to assign role: ${data.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      // Console statement removed for security
      alert('âŒ Network error: Failed to assign role. Please try again.');
    }
  };

  const handleRemoveRole = async (userId: number, roleId: number) => {
    if (!confirm('Are you sure you want to remove this role from the user?')) return;

    try {
      const response = await fetch(`/api/admin/rbac/users/${userId}/roles?roleId=${roleId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      // Console log removed for security

      if (response.ok && data.success) {
        // Refresh user roles
        setUserRoles(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
        await fetchUserRoles(userId);
        alert('✅ Role removed successfully!');
      } else {
        // Console statement removed for security
        
        if (response.status === 401) {
          alert('âŒ Unauthorized. You need super admin access to remove roles.');
        } else if (response.status === 404) {
          alert('âŒ User or role not found.');
        } else {
          alert(`âŒ Failed to remove role: ${data.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      // Console statement removed for security
      alert('âŒ Network error: Failed to remove role. Please try again.');
    }
  };

  const getAvailableRoles = (userId: number) => {
    const assignedRoleIds = userRoles[userId]?.map(ur => ur.roleId) || [];
    const available = roles.filter(role => role.isActive && !assignedRoleIds.includes(role.id));
    return available;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Role Management</h2>
          <p className="text-gray-600">Assign and manage roles for users.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {user.name}
                </CardTitle>
                <Badge variant={user.isActive ? "default" : "destructive"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{user.email}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchUserRoles(user.id)}
                    className="w-full"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {loadingRoles[user.id] ? 'Loading...' : 'View Roles'}
                  </Button>
                </div>

                {userRoles[user.id] && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        Assigned Roles ({userRoles[user.id].length})
                      </p>
                      <Dialog open={isAssignDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                        setIsAssignDialogOpen(open);
                        if (open) setSelectedUser(user);
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <UserPlus className="h-4 w-4 mr-1" />
                            Assign
                          </Button>
                        </DialogTrigger>
                        <DialogContent 
                          className="max-w-md bg-white border border-gray-200 shadow-xl"
                          style={{ 
                            backgroundColor: 'white', 
                            opacity: 1, 
                            zIndex: 50,
                            overflow: 'visible'
                          }}
                        >
                          <DialogHeader>
                            <DialogTitle>Assign Role to {user.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="role">Select Role</Label>
                              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                                <SelectTrigger 
                                  className="w-full bg-white border border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                  style={{ backgroundColor: 'white', opacity: 1, zIndex: 1 }}
                                >
                                  <SelectValue placeholder="Choose a role..." />
                                </SelectTrigger>
                                <SelectContent 
                                  className="bg-white border border-gray-300 shadow-xl z-[99999]" 
                                  position="popper" 
                                  sideOffset={8}
                                  alignOffset={0}
                                  style={{ 
                                    backgroundColor: 'white', 
                                    opacity: 1, 
                                    zIndex: 99999,
                                    border: '1px solid #d1d5db',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                                  }}
                                >
                                  {getAvailableRoles(user.id).length === 0 ? (
                                    <div className="p-3 text-sm text-gray-500 bg-white border-b">
                                      No available roles to assign
                                    </div>
                                  ) : (
                                    getAvailableRoles(user.id).map((role) => (
                                      <SelectItem 
                                        key={role.id} 
                                        value={role.id.toString()}
                                        className="bg-white hover:bg-blue-50 focus:bg-blue-50 cursor-pointer px-3 py-2"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-gray-900">{role.displayName}</span>
                                          {role.isSystemRole && (
                                            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">System</Badge>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              {getAvailableRoles(user.id).length === 0 && (
                                <p className="text-xs text-gray-500">
                                  User already has all available roles assigned.
                                </p>
                              )}
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                onClick={() => setIsAssignDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={handleAssignRole}
                                disabled={!selectedRoleId}
                              >
                                Assign Role
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="space-y-2">
                      {userRoles[user.id].length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No roles assigned</p>
                      ) : (
                        userRoles[user.id].map((userRole) => (
                          <div key={userRole.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {userRole.role?.displayName || 'Unknown Role'}
                              </Badge>
                              {userRole.role?.isSystemRole && (
                                <Badge variant="secondary" className="text-xs">System</Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveRole(user.id, userRole.roleId)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search terms.' : 'No users are available in the system.'}
          </p>
        </div>
      )}
    </div>
  );
}

