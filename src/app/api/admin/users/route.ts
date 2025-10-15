import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session-security";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Get all users for user management portal
export async function GET() {
  try {
    // Use secure session validation with role checking
    const session = await requireAdmin();
    
    console.log(`Admin user ${session.user.id} (${session.user.role}) accessing user list`);
  } catch (error) {
    console.error("Unauthorized access attempt to user list:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unauthorized access" 
    }, { status: 401 });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT id, name, email, role, status, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
