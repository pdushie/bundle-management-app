import NextAuth from "next-auth";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from 'next-auth/next'
import { Pool } from 'pg';
import bcrypt from "bcryptjs";
import { OTPConfig } from './otpConfig';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function getServerAuthSession() {
  return await getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getServerAuthSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function requireAdmin() {
  const session = await requireAuth() as any
  if (session.user?.role !== 'admin' && session.user?.role !== 'standard_admin' && session.user?.role !== 'super_admin' && session.user?.role !== 'data_processor' && session.user?.role !== 'moderator') {
    throw new Error('Admin access required')
  }
  return session
}

export async function requireSuperAdmin() {
  const session = await requireAuth() as any
  if (session.user?.role !== 'super_admin') {
    throw new Error('Super Admin access required')
  }
  return session
}

// Utility function to verify user role from database
async function verifyUserRole(userId: string): Promise<string | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT role, status, is_active FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows[0];
    
    // Check if user is still active and approved
    if (user.status !== 'approved' || user.is_active === false) {
      return null;
    }
    
    return user.role;
  } finally {
    client.release();
  }
}

// Utility function to get user's RBAC roles
async function getUserRBACRoles(userId: number): Promise<string[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT r.name as role_name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1 AND ur.is_active = true AND r.is_active = true
      ORDER BY r.name
    `, [userId]);
    
    return result.rows.map(row => row.role_name);
  } finally {
    client.release();
  }
}

// Get the primary role for session (preferring super_admin > admin > standard_admin > data_processor > moderator > user > viewer)
async function getPrimaryRole(userId: number): Promise<string> {
  const roles = await getUserRBACRoles(userId);
  
  if (roles.includes('super_admin')) return 'super_admin';
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('standard_admin')) return 'standard_admin';
  if (roles.includes('data_processor')) return 'data_processor';
  if (roles.includes('moderator')) return 'moderator';
  if (roles.includes('user')) return 'user';
  if (roles.includes('viewer')) return 'viewer';
  
  // Fallback to legacy role if no RBAC roles
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.role || 'user';
  } finally {
    client.release();
  }
}

// Build providers array conditionally based on OTP configuration
function buildProviders() {
  const providers: any[] = [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const client = await pool.connect();
        
        try {
          const result = await client.query(
            'SELECT * FROM users WHERE email = $1',
            [credentials.email]
          );

          // User not found - return null without revealing this information
          if (result.rows.length === 0) {
            return null;
          }

          const user = result.rows[0];
          
          // For security, we return null for any authentication failure
          // This prevents user enumeration attacks
          
          // Check email verification
          if (!user.email_verified) {
            return null;
          }
          
          // Check account status
          if (user.status !== 'approved') {
            return null;
          }
          
          // Check if account is active
          if (user.is_active === false) {
            return null;
          }
          
          // Verify password
          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.hashed_password
          );

          if (!passwordMatch) {
            return null;
          }

          // Update last login timestamp
          try {
            await client.query(
              'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
              [user.id]
            );
            // Updated last login timestamp - logging removed for security
          } catch (error) {
            // Console statement removed for security
            // Don't fail the login if this update fails
          }

          // User authenticated - logging removed for security
          
          // Get RBAC role for session
          const primaryRole = await getPrimaryRole(user.id);
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: primaryRole,
          };
        } finally {
          client.release();
        }
      },
    })
  ];

  // Only add OTP provider if OTP is enabled
  if (OTPConfig.isEnabled()) {
    providers.push(
      CredentialsProvider({
        id: "otp",
        name: "otp",
        credentials: {
          userId: { label: "User ID", type: "text" },
          otpCode: { label: "OTP Code", type: "text" }
        },
        async authorize(credentials) {
          if (!credentials?.userId || !credentials?.otpCode) {
            return null;
          }

          const { OTPService } = await import('./otpService');
          
          // Verify and consume OTP (final verification)
          const result = await OTPService.verifyAndConsumeOTP(credentials.userId, credentials.otpCode);
          
          if (!result.success) {
            throw new Error(result.message);
          }

          // OTP verified, get user data
          const client = await pool.connect();
          
          try {
            const userResult = await client.query(
              'SELECT id, email, name, role FROM users WHERE id = $1',
              [credentials.userId]
            );

            if (userResult.rows.length === 0) {
              return null;
            }

            const user = userResult.rows[0];
            
            // OTP User authenticated - logging removed for security
            
            // Get RBAC role for session
            const primaryRole = await getPrimaryRole(user.id);
            
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: primaryRole,
            };
          } finally {
            client.release();
          }
        },
      })
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // 2 hours
    updateAge: 30 * 60, // Update session every 30 minutes on activity
  },
  secret: process.env.NEXTAUTH_SECRET,
  
  // Enable JWT encryption for additional security
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 2 * 60 * 60, // 2 hours
    // Add encryption options
    encode: async (params) => {
      // Use default NextAuth JWT encoding with encryption
      const { encode } = await import('next-auth/jwt');
      return encode({
        ...params,
        secret: process.env.NEXTAUTH_SECRET!,
        // Add additional security headers
        token: {
          ...params.token,
          // Add timestamp for additional validation
          iat: Math.floor(Date.now() / 1000),
          // Add a security hash based on user ID and role
          sec: params.token?.id ? 
            require('crypto').createHash('sha256')
              .update(`${params.token.id}:${params.token.role}:${process.env.NEXTAUTH_SECRET}`)
              .digest('hex').substring(0, 16) : undefined
        }
      });
    },
    decode: async (params) => {
      const { decode } = await import('next-auth/jwt');
      const token = await decode({
        ...params,
        secret: process.env.NEXTAUTH_SECRET!
      });
      
      // Verify the security hash if token exists
      if (token?.id && token?.role && token?.sec) {
        const expectedHash = require('crypto').createHash('sha256')
          .update(`${token.id}:${token.role}:${process.env.NEXTAUTH_SECRET}`)
          .digest('hex').substring(0, 16);
          
        if (token.sec !== expectedHash) {
          // Console statement removed for security
          return null;
        }
      }
      
      return token;
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: buildProviders(),
  callbacks: {
    async jwt({ token, user, trigger }) {
      // On initial sign in
      if (user) {
        // JWT callback - user data - logging removed for security
        return {
          ...token,
          id: user.id,
          role: user.role,
          // Add timestamp for session validation
          roleVerifiedAt: Math.floor(Date.now() / 1000),
        };
      }
      
      // On subsequent requests, verify role hasn't been tampered with
      const now = Math.floor(Date.now() / 1000);
      const roleVerifiedAt = (token as any)?.roleVerifiedAt || 0;
      
      if (token?.id && (trigger === 'update' || !roleVerifiedAt || 
          (now - roleVerifiedAt) > 900)) { // Verify every 15 minutes
        
        // Verifying user role from database - logging removed for security
        
        // First check if user is still active
        const legacyRole = await verifyUserRole(token.id as string);
        if (legacyRole === null) {
          // Console statement removed for security
          return {
            ...token,
            invalid: true
          };
        }
        
        // Get current RBAC role
        const currentRole = await getPrimaryRole(parseInt(token.id as string));
        
        if (currentRole !== token.role) {
          // RBAC role updated - logging removed for security
          token.role = currentRole;
        }
        
        // Update verification timestamp
        (token as any).roleVerifiedAt = now;
      }
      
      return token;
    },
    async session({ session, token }) {
      // Additional security check: verify token is valid
      if (!token || !token.id || (token as any).invalid) {
        // Console statement removed for security
        throw new Error('Session invalid - please sign in again');
      }
      
      // Session callback - token data - logging removed for security
      
      const sessionData = {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          role: token.role,
        },
        // Add session metadata for additional security
        expires: session.expires,
      };
      
      // Add a session signature to detect tampering
      try {
        const crypto = require('crypto');
        (sessionData as any).signature = crypto.createHash('sha256')
          .update(`${token.id}:${token.role}:${session.expires}:${process.env.NEXTAUTH_SECRET}`)
          .digest('hex').substring(0, 12);
      } catch (error) {
        // Console statement removed for security
      }
      
      return sessionData;
    },
  },
};

