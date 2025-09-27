import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "superadmin") {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields" }, 
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" }, 
        { status: 400 }
      );
    }

    // Password validation (at least 8 characters)
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" }, 
        { status: 400 }
      );
    }

    // Check if email already exists
    const client = await pool.connect();
    
    try {
      const emailCheck = await client.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      if (emailCheck.rows.length > 0) {
        return NextResponse.json(
          { error: "Email already exists" }, 
          { status: 400 }
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      const result = await client.query(
        `INSERT INTO users (name, email, hashed_password, role, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, role, status, created_at`,
        [name, email, hashedPassword, role, "approved"]
      );

      return NextResponse.json({ 
        message: "User created successfully",
        user: result.rows[0]
      }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
