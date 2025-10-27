import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { users } from "../../../../../lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database connection unavailable' }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.role || !['admin', 'standard_admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // Get all users with their minimum order entries
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      isActive: users.isActive,
      minimumOrderEntries: users.minimumOrderEntries
    }).from(users).orderBy(users.name);
    
    return NextResponse.json({
      success: true,
      users: allUsers
    });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database connection unavailable' }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.role || !['admin', 'standard_admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    const { userId, minimumOrderEntries } = await req.json();
    
    // Validate input
    if (!userId || minimumOrderEntries === undefined || minimumOrderEntries === null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    if (minimumOrderEntries < 1 || minimumOrderEntries > 1000) {
      return NextResponse.json({ error: "Minimum order entries must be between 1 and 1000" }, { status: 400 });
    }
    
    // Update user's minimum order entries
    const result = await db.update(users)
      .set({ 
        minimumOrderEntries: minimumOrderEntries,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        minimumOrderEntries: users.minimumOrderEntries
      });
    
    if (result.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      user: result[0],
      message: `Minimum order entries updated to ${minimumOrderEntries} for ${result[0].name}`
    });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json({ error: "Failed to update minimum entries" }, { status: 500 });
  }
}

