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
    
    if (!session?.user || !["super_admin", "admin", "standard_admin"].includes(session.user.role)) {
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

    const client = await pool.connect();
    
    try {
      // Validate role against RBAC system
      const roleValidationQuery = await client.query(
        "SELECT id FROM roles WHERE name = $1 AND is_active = true",
        [role]
      );
      
      if (roleValidationQuery.rows.length === 0) {
        return NextResponse.json(
          { error: "Invalid or inactive role" }, 
          { status: 400 }
        );
      }

      // Update user role
      let result;
      try {
        result = await client.query(
          `UPDATE users 
           SET role = $1
           WHERE id = $2
           RETURNING id, name, email, role, status`,
          [role, userId]
        );
      } catch (updateError: any) {
        // Check if this is the constraint error
        if (updateError.code === '23514' && updateError.constraint === 'users_role_check') {
          console.log('Detected users_role_check constraint error. Attempting to remove constraint...');
          
          try {
            // Drop the constraint
            await client.query('ALTER TABLE users DROP CONSTRAINT users_role_check');
            console.log('Successfully removed users_role_check constraint');
            
            // Retry the update
            result = await client.query(
              `UPDATE users 
               SET role = $1
               WHERE id = $2
               RETURNING id, name, email, role, status`,
              [role, userId]
            );
          } catch (constraintError) {
            console.error('Failed to remove constraint or retry update:', constraintError);
            throw updateError; // Re-throw original error
          }
        } else {
          throw updateError; // Re-throw if it's not the constraint error
        }
      }

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        );
      }

      const updatedUser = result.rows[0];
      const isCurrentUser = updatedUser.id === (session.user as any).id;
      
      return NextResponse.json({ 
        message: "User role updated successfully",
        user: updatedUser,
        isCurrentUser,
        requiresReauth: isCurrentUser // Flag to indicate if re-authentication is needed
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Database error:", error);
    
    // Check if this is specifically the constraint error and provide helpful message
    if ((error as any).code === '23514' && (error as any).constraint === 'users_role_check') {
      return NextResponse.json(
        { error: "Database constraint prevents role update. The constraint couldn't be automatically removed. Please contact system administrator." },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}
