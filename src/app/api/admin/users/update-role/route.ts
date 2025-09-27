import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

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

    const { userId, role } = await req.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: "Missing userId or role" }, 
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["user", "admin", "manager", "superadmin"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" }, 
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // Update user role
      const result = await client.query(
        `UPDATE users 
         SET role = $1
         WHERE id = $2
         RETURNING id, name, email, role, status`,
        [role, userId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        );
      }

      return NextResponse.json({ 
        message: "User role updated successfully",
        user: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}
