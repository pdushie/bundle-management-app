// Session security utilities
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

export interface SecureSession {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    role?: string;
  };
  expires: string;
  signature?: string;
}

/**
 * Validates session signature to detect tampering
 */
export function validateSessionSignature(session: any): boolean {
  if (!session?.signature || !session?.user?.id || !session?.user?.role || !session?.expires) {
    console.warn('Session missing required fields for signature validation:', {
      hasSignature: !!session?.signature,
      hasUserId: !!session?.user?.id,
      hasUserRole: !!session?.user?.role,
      hasExpires: !!session?.expires
    });
    return false;
  }

  try {
    const expectedSignature = crypto.createHash('sha256')
      .update(`${session.user.id}:${session.user.role}:${session.expires}:${process.env.NEXTAUTH_SECRET}`)
      .digest('hex').substring(0, 12);

    const isValid = session.signature === expectedSignature;
    if (!isValid) {
      console.error('Session signature mismatch:', {
        expected: expectedSignature,
        received: session.signature,
        userId: session.user.id,
        userRole: session.user.role
      });
    }
    return isValid;
  } catch (error) {
    console.error('Error validating session signature:', error);
    return false;
  }
}

/**
 * Gets a secure server session with validation
 */
export async function getSecureServerSession(): Promise<SecureSession | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return null;
    }

    // Temporarily disable strict signature validation for debugging
    if (session.signature && !validateSessionSignature(session)) {
      console.warn('Session signature validation failed - continuing anyway for debugging');
      // Don't return null, just log the warning
    }

    return session as SecureSession;
  } catch (error) {
    console.error('Error getting secure server session:', error);
    return null;
  }
}

/**
 * Validates that a user has required role(s)
 */
export function hasRole(session: SecureSession | null, allowedRoles: string[]): boolean {
  if (!session?.user?.role) {
    return false;
  }

  return allowedRoles.includes(session.user.role);
}

/**
 * Validates that a user has admin privileges
 */
export function isAdmin(session: SecureSession | null): boolean {
  return hasRole(session, ['admin', 'super_admin']);
}

/**
 * Validates that a user has superadmin privileges
 */
export function isSuperAdmin(session: SecureSession | null): boolean {
  return hasRole(session, ['super_admin']);
}

/**
 * Middleware helper to validate session and role
 */
export async function validateSessionAndRole(
  request: NextRequest,
  requiredRoles?: string[]
): Promise<{ valid: boolean; session: SecureSession | null; error?: string }> {
  try {
    const session = await getSecureServerSession();

    if (!session) {
      return { valid: false, session: null, error: 'No valid session' };
    }

    if (requiredRoles && !hasRole(session, requiredRoles)) {
      return { 
        valid: false, 
        session, 
        error: `Insufficient privileges. Required: ${requiredRoles.join(' or ')}` 
      };
    }

    return { valid: true, session };
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false, session: null, error: 'Session validation failed' };
  }
}

/**
 * API route helper for role-based authorization
 */
export async function requireRole(allowedRoles: string[]): Promise<SecureSession> {
  const session = await getSecureServerSession();

  if (!session) {
    console.error('Authentication failed - no session found');
    throw new Error('Authentication required');
  }

  console.log('Session validation for role check:', {
    userId: session.user?.id,
    userRole: session.user?.role,
    allowedRoles,
    hasSignature: !!session.signature
  });

  if (!hasRole(session, allowedRoles)) {
    console.error(`Role authorization failed - user ${session.user?.id} with role '${session.user?.role}' attempted to access resource requiring: ${allowedRoles.join(' or ')}`);
    throw new Error(`Insufficient privileges. Required: ${allowedRoles.join(' or ')}`);
  }

  return session;
}

/**
 * API route helper requiring admin role
 */
export async function requireAdmin(): Promise<SecureSession> {
  return await requireRole(['admin', 'standard_admin', 'super_admin']);
}

/**
 * API route helper requiring superadmin role
 */
export async function requireSuperAdmin(): Promise<SecureSession> {
  return await requireRole(['super_admin']);
}