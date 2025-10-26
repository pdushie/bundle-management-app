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
    
    if (!session?.user || !session.user.role || !["super_admin", "admin", "standard_admin"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: "Missing userId or newPassword" }, 
        { status: 400 }
      );
    }

    // Password validation (at least 8 characters)
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" }, 
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // Check if user exists
      const userCheck = await client.query(
        "SELECT * FROM users WHERE id = $1",
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await client.query(
        `UPDATE users 
         SET hashed_password = $1
         WHERE id = $2`,
        [hashedPassword, userId]
      );

      return NextResponse.json({ 
        message: "Password reset successfully"
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
