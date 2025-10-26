'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Shield, Key, Check, X, Copy } from 'lucide-react';

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

interface Permission {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  resource: string;
  action: string;
  isActive: boolean;
  createdAt: Date;
}

interface RoleManagementProps {
  roles: Role[];
  permissions: Permission[];
  onRolesChange: (roles: Role[]) => void;
}

export function RoleManagement({ roles, permissions, onRolesChange }: RoleManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<Record<number, Permission[]>>({});
  const [loadingPermissions, setLoadingPermissions] = useState<Record<number, boolean>>({});

  const [newRole, setNewRole] = useState({
    name: '',
    displayName: '',
    description: '',
    permissionIds: [] as number[]
  });

  const [editRole, setEditRole] = useState({
    id: 0,
    name: '',
    displayName: '',
    description: '',
    permissionIds: [] as number[],
    isActive: true
  });

  const [duplicateRole, setDuplicateRole] = useState({
    name: '',
    displayName: '',
    description: '',
    permissionIds: [] as number[]
  });

  const fetchRolePermissions = async (roleId: number) => {
    if (rolePermissions[roleId] || loadingPermissions[roleId]) return;
    
    setLoadingPermissions(prev => ({ ...prev, [roleId]: true }));
    
    try {
      const response = await fetch(`/api/admin/rbac/roles/${roleId}/permissions`);
      const data = await response.json();
      
      if (data.success) {
        setRolePermissions(prev => ({ ...prev, [roleId]: data.data }));
      }
    } catch (error) {
      console.error('Error fetching role permissions:', error);
    } finally {
      setLoadingPermissions(prev => ({ ...prev, [roleId]: false }));
    }
  };

  const loadRoleForEdit = async (role: Role) => {
    setSelectedRole(role);
    
    // Load current permissions for this role
    try {
      const response = await fetch(`/api/admin/rbac/roles/${role.id}/permissions`);
      const data = await response.json();
      
      const currentPermissionIds = data.success ? data.data.map((p: Permission) => p.id) : [];
      
      setEditRole({
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        description: role.description || '',
        permissionIds: currentPermissionIds,
        isActive: role.isActive
      });
      
      setIsEditDialogOpen(true);
    } catch (error) {
      console.error('Error loading role for edit:', error);
      alert('Failed to load role data');
    }
  };

  const loadRoleForDuplicate = async (role: Role) => {
    setSelectedRole(role);
    
    // Load current permissions for this role
    try {
      const response = await fetch(`/api/admin/rbac/roles/${role.id}/permissions`);
      const data = await response.json();
      
      const currentPermissionIds = data.success ? data.data.map((p: Permission) => p.id) : [];
      
      setDuplicateRole({
        name: `${role.name}_copy`,
        displayName: `${role.displayName} (Copy)`,
        description: role.description || '',
        permissionIds: currentPermissionIds
      });
      
      setIsDuplicateDialogOpen(true);
    } catch (error) {
      console.error('Error loading role for duplicate:', error);
      alert('Failed to load role data');
    }
  };

  const handleCreateRole = async () => {
    try {
      const response = await fetch('/api/admin/rbac/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRole),
      });

      const data = await response.json();

      if (data.success) {
        onRolesChange([...roles, data.data]);
        setNewRole({ name: '', displayName: '', description: '', permissionIds: [] });
        setIsCreateDialogOpen(false);
      } else {
        alert(data.error || 'Failed to create role');
      }
    } catch (error) {
      console.error('Error creating role:', error);
      alert('Failed to create role');
    }
  };

  const handleDuplicateRole = async () => {
    try {
      const response = await fetch('/api/admin/rbac/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicateRole),
      });

      const data = await response.json();

      if (data.success) {
        onRolesChange([...roles, data.data]);
        setDuplicateRole({ name: '', displayName: '', description: '', permissionIds: [] });
        setIsDuplicateDialogOpen(false);
        setSelectedRole(null);
      } else {
        alert(data.error || 'Failed to duplicate role');
      }
    } catch (error) {
      console.error('Error duplicating role:', error);
      alert('Failed to duplicate role');
    }
  };

  const handlePermissionToggle = (permissionId: number, checked: boolean, mode: 'create' | 'edit' | 'duplicate' = 'create') => {
    if (mode === 'edit') {
      setEditRole(prev => ({
        ...prev,
        permissionIds: checked 
          ? [...prev.permissionIds, permissionId]
          : prev.permissionIds.filter(id => id !== permissionId)
      }));
    } else if (mode === 'duplicate') {
      setDuplicateRole(prev => ({
        ...prev,
        permissionIds: checked 
          ? [...prev.permissionIds, permissionId]
          : prev.permissionIds.filter(id => id !== permissionId)
      }));
    } else {
      setNewRole(prev => ({
        ...prev,
        permissionIds: checked 
          ? [...prev.permissionIds, permissionId]
          : prev.permissionIds.filter(id => id !== permissionId)
      }));
    }
  };

  const handleUpdateRole = async () => {
    try {
      const response = await fetch(`/api/admin/rbac/roles/${editRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editRole.name,
          displayName: editRole.displayName,
          description: editRole.description,
          permissionIds: editRole.permissionIds,
          isActive: editRole.isActive
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the roles list
        const updatedRoles = roles.map(role => 
          role.id === editRole.id ? { ...role, ...data.data } : role
        );
        onRolesChange(updatedRoles);
        
        // Clear role permissions cache to force refresh
        setRolePermissions(prev => {
          const updated = { ...prev };
          delete updated[editRole.id];
          return updated;
        });
        
        setIsEditDialogOpen(false);
        setSelectedRole(null);
      } else {
        alert(data.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
    }
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-gray-600">Create and manage user roles and their permissions.</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white border border-gray-200 shadow-xl relative z-50" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Role Name (Identifier)</Label>
                  <Input
                    id="name"
                    value={newRole.name}
                    onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., custom_admin"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={newRole.displayName}
                    onChange={(e) => setNewRole(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="e.g., Custom Administrator"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newRole.description}
                  onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this role can do..."
                />
              </div>

              <div className="space-y-4">
                <Label>Permissions</Label>
                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
                    <div key={resource} className="mb-4">
                      <h4 className="font-semibold capitalize text-sm text-gray-700 mb-2">{resource}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {resourcePermissions.map((permission) => (
                          <label key={permission.id} className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={newRole.permissionIds.includes(permission.id)}
                              onChange={(e) => handlePermissionToggle(permission.id, e.target.checked, 'create')}
                              className="rounded"
                            />
                            <span>{permission.displayName}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateRole}>
                  Create Role
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] max-w-4xl max-h-[80vh] overflow-y-auto bg-white border border-gray-200 shadow-xl z-[100]" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <DialogHeader>
            <DialogTitle>Edit Role: {selectedRole?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Role Name (Identifier)</Label>
                <Input
                  id="edit-name"
                  value={editRole.name}
                  onChange={(e) => setEditRole(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., custom_admin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-displayName">Display Name</Label>
                <Input
                  id="edit-displayName"
                  value={editRole.displayName}
                  onChange={(e) => setEditRole(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="e.g., Custom Administrator"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editRole.description}
                onChange={(e) => setEditRole(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this role can do..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={editRole.isActive}
                onChange={(e) => setEditRole(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="edit-isActive">Role is active</Label>
            </div>

            <div className="space-y-4">
              <Label>Permissions</Label>
              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
                  <div key={resource} className="mb-4">
                    <h4 className="font-semibold capitalize text-sm text-gray-700 mb-2">{resource}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {resourcePermissions.map((permission) => (
                        <label key={permission.id} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editRole.permissionIds.includes(permission.id)}
                            onChange={(e) => handlePermissionToggle(permission.id, e.target.checked, 'edit')}
                            className="rounded"
                          />
                          <span>{permission.displayName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedRole(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateRole}>
                Update Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Role Dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] max-w-4xl max-h-[80vh] overflow-y-auto bg-white border border-gray-200 shadow-xl z-[100]" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
          <DialogHeader>
            <DialogTitle>Duplicate Role: {selectedRole?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You are creating a copy of "{selectedRole?.displayName}". 
                All permissions from the original role will be copied. You can modify the name, 
                description, and permissions as needed.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duplicate-name">Role Name (Identifier)</Label>
                <Input
                  id="duplicate-name"
                  value={duplicateRole.name}
                  onChange={(e) => setDuplicateRole(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., custom_admin_copy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duplicate-displayName">Display Name</Label>
                <Input
                  id="duplicate-displayName"
                  value={duplicateRole.displayName}
                  onChange={(e) => setDuplicateRole(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="e.g., Custom Administrator (Copy)"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duplicate-description">Description</Label>
              <Textarea
                id="duplicate-description"
                value={duplicateRole.description}
                onChange={(e) => setDuplicateRole(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this role can do..."
              />
            </div>

            <div className="space-y-4">
              <Label>Permissions (copied from original role)</Label>
              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
                  <div key={resource} className="mb-4">
                    <h4 className="font-semibold capitalize text-sm text-gray-700 mb-2">{resource}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {resourcePermissions.map((permission) => (
                        <label key={permission.id} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={duplicateRole.permissionIds.includes(permission.id)}
                            onChange={(e) => handlePermissionToggle(permission.id, e.target.checked, 'duplicate')}
                            className="rounded"
                          />
                          <span>{permission.displayName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDuplicateDialogOpen(false);
                  setSelectedRole(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleDuplicateRole}>
                <Copy className="h-4 w-4 mr-2" />
                Create Duplicate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {role.displayName}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {role.isSystemRole && (
                    <Badge variant="secondary">System</Badge>
                  )}
                  <Badge variant={role.isActive ? "default" : "destructive"}>
                    {role.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Role ID: {role.name}</p>
                  {role.description && (
                    <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                  )}
                </div>

                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchRolePermissions(role.id)}
                    className="w-full"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    {loadingPermissions[role.id] ? 'Loading...' : 'View Permissions'}
                  </Button>
                </div>

                {rolePermissions[role.id] && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium mb-2">
                      Permissions ({rolePermissions[role.id].length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {rolePermissions[role.id].slice(0, 3).map((perm) => (
                        <Badge key={perm.id} variant="outline" className="text-xs">
                          {perm.displayName}
                        </Badge>
                      ))}
                      {rolePermissions[role.id].length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{rolePermissions[role.id].length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadRoleForEdit(role)}
                    className="w-full"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Role
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadRoleForDuplicate(role)}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Role
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}