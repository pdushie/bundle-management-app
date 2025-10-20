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
  if (session.user?.role !== 'admin' && session.user?.role !== 'superadmin') {
    throw new Error('Admin access required')
  }
  return session
}

export async function requireSuperAdmin() {
  const session = await requireAuth() as any
  if (session.user?.role !== 'superadmin') {
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

// Build providers array conditionally based on OTP configuration
function buildProviders() {
  const providers = [
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

          if (result.rows.length === 0) {
            return null;
          }

          const user = result.rows[0];
          
          // Check email verification first
          if (!user.email_verified) {
            throw new Error('Please verify your email address before signing in. Check your email for the verification link.');
          }
          
          // Check account status
          if (user.status === 'pending') {
            throw new Error('Your account is pending approval');
          }
          
          if (user.status === 'rejected') {
            throw new Error('Your request for account was rejected. Please contact support');
          }
          
          if (user.status !== 'approved') {
            throw new Error('Account access denied');
          }
          
          // Check if account is active (not disabled)
          if (user.is_active === false) {
            throw new Error('Your account has been disabled. Please contact support');
          }
          
          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.hashed_password
          );

          if (!passwordMatch) {
            return null;
          }

          console.log('User authenticated:', { 
            id: user.id, 
            email: user.email, 
            name: user.name, 
            role: user.role 
          });
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || 'user',
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
            
            console.log('OTP User authenticated:', { 
              id: user.id, 
              email: user.email, 
              name: user.name, 
              role: user.role 
            });
            
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role || 'user',
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
          console.error('JWT security hash mismatch - possible tampering detected');
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
        console.log('JWT callback - user data:', { id: user.id, role: user.role });
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
        
        console.log('Verifying user role from database for user:', token.id);
        const currentRole = await verifyUserRole(token.id as string);
        
        if (currentRole === null) {
          console.error('User not found or inactive during role verification:', token.id);
          // Return a special token that will be handled in session callback
          return {
            ...token,
            invalid: true
          };
        }
        
        if (currentRole !== token.role) {
          console.error(`Role mismatch detected! Token role: ${token.role}, DB role: ${currentRole}`);
          // Update with correct role from database
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
        console.error('Invalid token in session callback');
        throw new Error('Session invalid - please sign in again');
      }
      
      console.log('Session callback - token data:', { id: token.id, role: token.role });
      
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
        console.error('Error creating session signature:', error);
      }
      
      return sessionData;
    },
  },
};
