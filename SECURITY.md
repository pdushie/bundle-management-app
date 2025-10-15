# Session Security Implementation Guide

## Overview
This implementation provides comprehensive session security to prevent tampering with role IDs and other sensitive session data.

## Security Features Implemented

### 1. JWT Encryption and Signing
- JWT tokens are encrypted using NextAuth's built-in encryption
- Custom security hash added to detect tampering
- Tokens are signed with a strong secret

### 2. Role Verification
- User roles are periodically verified against the database (every 15 minutes)
- If role mismatch is detected, the correct role is fetched from database
- Invalid users are automatically signed out

### 3. Session Signatures
- Each session includes a cryptographic signature
- Signature is based on user ID, role, expiration, and secret
- Tampered sessions are rejected

### 4. Middleware Security
- Enhanced authorization checks
- Token age verification
- Role-based path protection
- Suspicious activity logging

### 5. API Security Utilities
- Secure session helpers for API routes
- Role-based authorization functions
- Session validation utilities

## How to Use

### In API Routes
```typescript
import { requireAdmin, requireSuperAdmin, getSecureServerSession } from '@/lib/session-security';

// Require admin role
export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    // Your admin-only logic here
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// Require superadmin role
export async function DELETE(request: Request) {
  try {
    const session = await requireSuperAdmin();
    // Your superadmin-only logic here
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}

// Get secure session with validation
export async function GET(request: Request) {
  const session = await getSecureServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Your authenticated logic here
}
```

### In Server Components
```typescript
import { getSecureServerSession, isAdmin, isSuperAdmin } from '@/lib/session-security';

export default async function AdminPage() {
  const session = await getSecureServerSession();
  
  if (!session || !isAdmin(session)) {
    return <NotAuthorized />;
  }
  
  // Your admin component logic here
}
```

### In Client Components
```typescript
import { useSession } from 'next-auth/react';
import { validateSessionSignature } from '@/lib/session-security';

export default function ClientComponent() {
  const { data: session } = useSession();
  
  // Validate session on client side (optional additional check)
  const isValidSession = session && validateSessionSignature(session);
  
  if (!isValidSession) {
    return <div>Invalid session detected</div>;
  }
  
  // Your component logic here
}
```

## Security Benefits

1. **Tamper Detection**: Any modification to JWT tokens or sessions is detected
2. **Role Integrity**: User roles are regularly verified against the database
3. **Session Expiration**: Proper token age validation prevents old token reuse
4. **Authorization**: Granular role-based access control
5. **Audit Trail**: Comprehensive logging of security events
6. **Defense in Depth**: Multiple layers of security checks

## Environment Variables Required

Make sure these are set in your `.env.local`:
```
NEXTAUTH_SECRET=your-very-strong-secret-key-here
DATABASE_URL=your-database-connection-string
```

## Security Considerations

1. **Secret Management**: Keep `NEXTAUTH_SECRET` secure and rotate it periodically
2. **Database Security**: Ensure your database connection is secure
3. **HTTPS**: Always use HTTPS in production
4. **Session Duration**: Consider shorter session durations for high-security applications
5. **Monitoring**: Monitor logs for suspicious activity patterns

## Migration Guide

To migrate existing code to use the new security features:

1. Replace direct session access with secure utilities
2. Update API routes to use role-based authorization helpers
3. Add session validation to sensitive operations
4. Update client-side session handling

This implementation provides robust protection against:
- Session hijacking
- Role privilege escalation
- Token tampering
- Unauthorized access
- Session replay attacks