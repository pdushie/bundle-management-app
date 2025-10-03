import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Pool } from 'pg';

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
      "SELECT id, status FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
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
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create user with pending status
    await client.query(
      `INSERT INTO users (name, email, hashed_password, status, request_message) 
       VALUES ($1, $2, $3, 'pending', $4)`,
      [name, email, hashedPassword, requestMessage || null]
    );

    return NextResponse.json(
      { 
        message: "Registration successful! Your account is pending approval. You will be notified once approved.",
        status: "pending"
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
