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
    
    if (!session?.user || session.user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Unauthorized - Super admin access required" }, 
        { status: 401 }
      );
    }

    const client = await pool.connect();
    
    try {
      // Console log removed for security
      
      // Check if the constraint exists
      const constraintCheck = await client.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND constraint_name = 'users_role_check'
      `);
      
      if (constraintCheck.rows.length > 0) {
        // Console log removed for security
        
        // Drop the constraint
        await client.query('ALTER TABLE users DROP CONSTRAINT users_role_check');
        
        return NextResponse.json({ 
          success: true,
          message: "Successfully removed users_role_check constraint"
        });
      } else {
        return NextResponse.json({ 
          success: true,
          message: "users_role_check constraint does not exist"
        });
      }
    } finally {
      client.release();
    }
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { error: "Failed to fix role constraint", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

