import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { users } from "../../../../lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    // Check if database is available
    if (!db) {
      console.error('Database connection is not available');
      return NextResponse.json({ 
        error: 'Database connection unavailable'
      }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json({ error: "No email found in session" }, { status: 400 });
    }
    
    // Fetch user's settings from the database
    const userRecord = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      minimumOrderEntries: users.minimumOrderEntries
    }).from(users).where(eq(users.email, userEmail)).limit(1);
    
    if (userRecord.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const user = userRecord[0];
    
    return NextResponse.json({
      success: true,
      settings: {
        minimumOrderEntries: user.minimumOrderEntries || 1,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Error getting user settings:", error);
    return NextResponse.json({ error: "Failed to get user settings" }, { status: 500 });
  }
}