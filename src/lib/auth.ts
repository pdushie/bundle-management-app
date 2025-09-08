import NextAuth from "next-auth";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from 'next-auth/next'
import { Pool } from 'pg';
import bcrypt from "bcryptjs";

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
  if (session.user?.role !== 'admin') {
    throw new Error('Admin access required')
  }
  return session
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30, // 30 seconds
    updateAge: 0, // Disable session extension on activity
  },
  secret: process.env.NEXTAUTH_SECRET, // ADD THIS LINE
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    CredentialsProvider({
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
          
          // Check account status
          if (user.status === 'pending') {
            throw new Error('Your account is pending approval');
          }
          
          if (user.status === 'rejected') {
            throw new Error('Your account was rejected. Please contact support');
          }
          
          if (user.status !== 'approved') {
            throw new Error('Account access denied');
          }
          
          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.hashed_password
          );

          if (!passwordMatch) {
            return null;
          }

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
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          id: user.id,
          role: user.role,
        };
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          role: token.role,
        },
      };
    },
  },
};
