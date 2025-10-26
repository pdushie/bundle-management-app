import { db } from '@/lib/db';
import { users, roles, permissions, rolePermissions, userRoles } from '@/lib/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface Permission {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  resource: string;
  action: string;
  isActive: boolean;
  createdAt: Date;
}

export interface UserRole {
  id: number;
  userId: number;
  roleId: number;
  assignedAt: Date;
  assignedBy: number | null;
  expiresAt: Date | null;
  isActive: boolean;
  role?: Role;
}

export interface RolePermission {
  id: number;
  roleId: number;
  permissionId: number;
  grantedAt: Date;
  grantedBy: number | null;
  permission?: Permission;
}

// Check if user has a specific permission
export async function hasPermission(userId: number, permissionName: string): Promise<boolean> {
  if (!db) return false;

  try {
    const result = await db
      .select({
        permissionName: permissions.name,
      })
      .from(permissions)
      .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
      .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
      .innerJoin(userRoles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(permissions.name, permissionName),
          eq(permissions.isActive, true),
          eq(roles.isActive, true),
          eq(userRoles.isActive, true)
        )
      )
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

// Check if user has any of the specified permissions
export async function hasAnyPermission(userId: number, permissionNames: string[]): Promise<boolean> {
  if (!db || permissionNames.length === 0) return false;

  try {
    const result = await db
      .select({
        permissionName: permissions.name,
      })
      .from(permissions)
      .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
      .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
      .innerJoin(userRoles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          eq(userRoles.userId, userId),
          inArray(permissions.name, permissionNames),
          eq(permissions.isActive, true),
          eq(roles.isActive, true),
          eq(userRoles.isActive, true)
        )
      )
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
}

// Check if user has a specific role
export async function hasRole(userId: number, roleName: string): Promise<boolean> {
  if (!db) return false;

  try {
    const result = await db
      .select({
        roleName: roles.name,
      })
      .from(roles)
      .innerJoin(userRoles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(roles.name, roleName),
          eq(roles.isActive, true),
          eq(userRoles.isActive, true)
        )
      )
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('Error checking role:', error);
    return false;
  }
}

// Check if user is super admin
export async function isSuperAdmin(userId: number): Promise<boolean> {
  return await hasRole(userId, 'super_admin');
}

// Get all user permissions
export async function getUserPermissions(userId: number): Promise<Permission[]> {
  if (!db) return [];

  try {
    const result = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        displayName: permissions.displayName,
        description: permissions.description,
        resource: permissions.resource,
        action: permissions.action,
        isActive: permissions.isActive,
        createdAt: permissions.createdAt,
      })
      .from(permissions)
      .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
      .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
      .innerJoin(userRoles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(permissions.isActive, true),
          eq(roles.isActive, true),
          eq(userRoles.isActive, true)
        )
      );

    return result.map(p => ({
      ...p,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
    }));
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

// Get all user roles
export async function getUserRoles(userId: number): Promise<UserRole[]> {
  if (!db) return [];

  try {
    const result = await db
      .select({
        id: userRoles.id,
        userId: userRoles.userId,
        roleId: userRoles.roleId,
        assignedAt: userRoles.assignedAt,
        assignedBy: userRoles.assignedBy,
        expiresAt: userRoles.expiresAt,
        isActive: userRoles.isActive,
        roleName: roles.name,
        roleDisplayName: roles.displayName,
        roleDescription: roles.description,
        roleIsActive: roles.isActive,
        roleIsSystemRole: roles.isSystemRole,
        roleCreatedAt: roles.createdAt,
        roleUpdatedAt: roles.updatedAt,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.isActive, true),
          eq(roles.isActive, true)
        )
      );

    return result.map(ur => ({
      id: ur.id,
      userId: ur.userId,
      roleId: ur.roleId,
      assignedAt: ur.assignedAt ? new Date(ur.assignedAt) : new Date(),
      assignedBy: ur.assignedBy,
      expiresAt: ur.expiresAt ? new Date(ur.expiresAt) : null,
      isActive: ur.isActive,
      role: {
        id: ur.roleId,
        name: ur.roleName,
        displayName: ur.roleDisplayName,
        description: ur.roleDescription,
        isActive: ur.roleIsActive,
        isSystemRole: ur.roleIsSystemRole,
        createdAt: ur.roleCreatedAt ? new Date(ur.roleCreatedAt) : new Date(),
        updatedAt: ur.roleUpdatedAt ? new Date(ur.roleUpdatedAt) : null,
      },
    }));
  } catch (error) {
    console.error('Error getting user roles:', error);
    return [];
  }
}

// Require permission middleware
export async function requirePermission(permissionName: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    throw new Error('Authentication required');
  }

  const userId = parseInt((session.user as any).id);
  const hasAccess = await hasPermission(userId, permissionName);

  if (!hasAccess) {
    throw new Error(`Permission '${permissionName}' required`);
  }

  return { userId, session };
}

// Require super admin access
export async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    throw new Error('Authentication required');
  }

  const userId = parseInt((session.user as any).id);
  const isSuper = await isSuperAdmin(userId);

  if (!isSuper) {
    throw new Error('Super admin access required');
  }

  return { userId, session };
}

// Get all available roles
export async function getAllRoles(): Promise<Role[]> {
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(roles)
      .where(eq(roles.isActive, true))
      .orderBy(roles.displayName);

    return result.map(r => ({
      ...r,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : null,
    }));
  } catch (error) {
    console.error('Error getting roles:', error);
    return [];
  }
}

// Get all available permissions
export async function getAllPermissions(): Promise<Permission[]> {
  if (!db) return [];

  try {
    const result = await db
      .select()
      .from(permissions)
      .where(eq(permissions.isActive, true))
      .orderBy(permissions.resource, permissions.action);

    return result.map(p => ({
      ...p,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
    }));
  } catch (error) {
    console.error('Error getting permissions:', error);
    return [];
  }
}

// Get permissions for a specific role
export async function getRolePermissions(roleId: number): Promise<Permission[]> {
  if (!db) return [];

  try {
    const result = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        displayName: permissions.displayName,
        description: permissions.description,
        resource: permissions.resource,
        action: permissions.action,
        isActive: permissions.isActive,
        createdAt: permissions.createdAt,
      })
      .from(permissions)
      .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(rolePermissions.roleId, roleId),
          eq(permissions.isActive, true)
        )
      )
      .orderBy(permissions.resource, permissions.action);

    return result.map(p => ({
      ...p,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
    }));
  } catch (error) {
    console.error('Error getting role permissions:', error);
    return [];
  }
}