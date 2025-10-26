'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Key, Search, Shield } from 'lucide-react';

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

interface PermissionOverviewProps {
  permissions: Permission[];
}

export function PermissionOverview({ permissions }: PermissionOverviewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResource, setSelectedResource] = useState<string>('all');

  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = 
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesResource = selectedResource === 'all' || permission.resource === selectedResource;
    
    return matchesSearch && matchesResource;
  });

  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const resources = [...new Set(permissions.map(p => p.resource))].sort();

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'read':
      case 'view':
        return 'bg-blue-100 text-blue-800';
      case 'update':
      case 'edit':
        return 'bg-yellow-100 text-yellow-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'manage':
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Permission Overview</h2>
          <p className="text-gray-600">View all available system permissions and their details.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedResource}
          onChange={(e) => setSelectedResource(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Resources</option>
          {resources.map((resource) => (
            <option key={resource} value={resource}>
              {resource.charAt(0).toUpperCase() + resource.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
          <Card key={resource}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {resource.charAt(0).toUpperCase() + resource.slice(1)} Permissions
              </CardTitle>
              <p className="text-sm text-gray-600">
                {resourcePermissions.length} permission{resourcePermissions.length !== 1 ? 's' : ''}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {resourcePermissions.map((permission) => (
                  <div key={permission.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{permission.displayName}</span>
                      </div>
                      <Badge 
                        className={getActionColor(permission.action)}
                        variant="secondary"
                      >
                        {permission.action}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><span className="font-medium">Name:</span> {permission.name}</p>
                      {permission.description && (
                        <p><span className="font-medium">Description:</span> {permission.description}</p>
                      )}
                      <p><span className="font-medium">Resource:</span> {permission.resource}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={permission.isActive ? "default" : "destructive"}>
                        {permission.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Created: {new Date(permission.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPermissions.length === 0 && (
        <div className="text-center py-12">
          <Key className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No permissions found</h3>
          <p className="text-gray-600">
            {searchTerm || selectedResource !== 'all' 
              ? 'Try adjusting your search criteria.' 
              : 'No permissions are available in the system.'}
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Permission System Information</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• Permissions are organized by resource (users, orders, admin, etc.)</p>
          <p>• Each permission has a specific action (create, read, update, delete, manage)</p>
          <p>• System permissions are automatically created and maintained</p>
          <p>• Only super admins can view and manage the permission system</p>
        </div>
      </div>
    </div>
  );
}