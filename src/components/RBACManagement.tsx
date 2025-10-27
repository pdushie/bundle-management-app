'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  Key, 
  Settings,
  UserPlus,
  Plus,
  Edit,
  Trash2,
  Lock
} from 'lucide-react';
import { RoleManagement } from './RoleManagement';
import { UserRoleManagement } from './UserRoleManagement';
import { PermissionOverview } from './PermissionOverview';

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

interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
}

export default function RBACManagement() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is super admin
  const isSuperAdmin = session?.user && (session.user as any).role === 'super_admin';

  useEffect(() => {
    if (!isSuperAdmin) {
      setError('Super admin access required');
      setLoading(false);
      return;
    }

    fetchInitialData();
  }, [isSuperAdmin]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [rolesRes, permissionsRes, usersRes] = await Promise.all([
        fetch('/api/admin/rbac/roles'),
        fetch('/api/admin/rbac/permissions'),
        fetch('/api/admin/rbac/users')
      ]);

      if (!rolesRes.ok || !permissionsRes.ok || !usersRes.ok) {
        throw new Error('Failed to fetch RBAC data');
      }

      const [rolesData, permissionsData, usersData] = await Promise.all([
        rolesRes.json(),
        permissionsRes.json(),
        usersRes.json()
      ]);

      if (rolesData.success) setRoles(rolesData.data);
      if (permissionsData.success) setPermissions(permissionsData.data);
      if (usersData.success) setUsers(usersData.data);

    } catch (err) {
      // Console statement removed for security
      setError('Failed to load RBAC data');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600">Please sign in to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <Shield className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">Super admin access is required to manage roles and permissions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading RBAC management...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <div className="text-red-600 text-xl mb-4">âš ï¸</div>
            <h2 className="text-lg font-semibold mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchInitialData} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Role & Permission Management</h1>
        <p className="text-gray-600">
          Manage user roles, permissions, and access control for the application.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Roles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{roles.length}</div>
                <p className="text-xs text-muted-foreground">
                  {roles.filter(r => r.isSystemRole).length} system roles
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-xs text-muted-foreground">
                  Users with access to the system
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Permissions</CardTitle>
                <Key className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{permissions.length}</div>
                <p className="text-xs text-muted-foreground">
                  Available system permissions
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {roles.slice(0, 5).map((role) => (
                    <div key={role.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{role.displayName}</div>
                        <div className="text-sm text-gray-500">{role.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {role.isSystemRole && (
                          <Badge variant="secondary">System</Badge>
                        )}
                        <Badge variant={role.isActive ? "default" : "destructive"}>
                          {role.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Permission Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    permissions.reduce((acc, perm) => {
                      acc[perm.resource] = (acc[perm.resource] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).slice(0, 5).map(([resource, count]) => (
                    <div key={resource} className="flex items-center justify-between">
                      <div className="font-medium capitalize">{resource}</div>
                      <Badge variant="outline">{count} permissions</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <RoleManagement 
            roles={roles} 
            permissions={permissions}
            onRolesChange={setRoles}
          />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserRoleManagement 
            users={users}
            roles={roles}
            onUsersChange={setUsers}
          />
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <PermissionOverview permissions={permissions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

