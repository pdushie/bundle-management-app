import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Pool } from 'pg';
import { sendVerificationEmail, generateVerificationToken, getVerificationTokenExpiry } from '@/lib/email';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { name, email, password, confirmPassword, requestMessage } = await req.json();

    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await client.query(
      "SELECT id, status, email_verified FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      
      // If user exists but email not verified, allow resending verification
      if (!user.email_verified) {
        return NextResponse.json(
          { 
            error: "An account with this email already exists but is not verified. Please check your email for the verification link or request a new one.",
            resendAvailable: true
          },
          { status: 400 }
        );
      }
      
      if (user.status === 'pending') {
        return NextResponse.json(
          { error: "Your registration is still pending approval" },
          { status: 400 }
        );
      } else if (user.status === 'rejected') {
        return NextResponse.json(
          { error: "Your registration was rejected. Please contact support" },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Generate verification token
    const verificationToken = generateVerificationToken();
    const tokenExpiry = getVerificationTokenExpiry();

    // Create user with pending status and email verification fields
    const result = await client.query(
      `INSERT INTO users (name, email, hashed_password, status, request_message, email_verified, verification_token, verification_token_expires) 
       VALUES ($1, $2, $3, 'pending', $4, false, $5, $6)
       RETURNING id, name, email`,
      [name, email, hashedPassword, requestMessage || null, verificationToken, tokenExpiry]
    );

    const newUser = result.rows[0];

    // Create verification URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;

    // Send verification email
    try {
      const emailResult = await sendVerificationEmail({
        to: email,
        name: name,
        verificationUrl
      });

      if (!emailResult.success) {
        // Console statement removed for security
        // Don't fail registration if email fails, but log it
      }
    } catch (emailError) {
      // Console statement removed for security
      // Continue with registration even if email fails
    }

    return NextResponse.json(
      { 
        message: "Registration successful! Please check your email to verify your account before it can be approved.",
        status: "pending_verification",
        requiresVerification: true
      },
      { status: 201 }
    );
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

