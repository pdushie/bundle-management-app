import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function POST(req: NextRequest) {
  // Define variables at the top scope so they're accessible in the catch block
  let userId: string = '';
  let enabled: boolean = false;
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !session.user.role || !["super_admin", "admin", "standard_admin"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    userId = body.userId;
    enabled = body.enabled;

    if (!userId || enabled === undefined) {
      return NextResponse.json(
        { error: "Missing userId or status" }, 
        { status: 400 }
      );
    }

    // Prevent superadmins from disabling themselves
    if (userId === (session.user as any).id && !enabled) {
      return NextResponse.json(
        { error: "Cannot disable your own account" }, 
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // Get user information
      const userCheck = await client.query(
        "SELECT role FROM users WHERE id = $1",
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        );
      }

      // Update both user active status and status field for consistency
      const newStatus = enabled ? 'approved' : 'disabled';
      const result = await client.query(
        `UPDATE users 
         SET is_active = $1, status = $2
         WHERE id = $3
         RETURNING id, name, email, role, status, is_active`,
        [enabled, newStatus, userId]
      );

      return NextResponse.json({ 
        message: `User ${enabled ? 'enabled' : 'disabled'} successfully`,
        user: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Database error:", error);
    // More generic error message that doesn't rely on the enabled variable
    return NextResponse.json(
      { error: "Failed to update user status" },
      { status: 500 }
    );
  }
}
