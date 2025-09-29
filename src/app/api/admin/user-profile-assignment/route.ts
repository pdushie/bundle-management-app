import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { userPricingProfiles } from "../../../../lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { and, eq } from "drizzle-orm";

/**
 * Route to directly assign users to pricing profiles
 * This avoids the complex nested dynamic route structure that's causing issues
 */

// POST method for assigning a user to a pricing profile
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins and superadmins
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    // Get request body
    const body = await request.json();
    const { userId, profileId } = body;
    
    if (!userId || !profileId || isNaN(parseInt(userId)) || isNaN(parseInt(profileId))) {
      return NextResponse.json({ error: "Valid user ID and profile ID are required" }, { status: 400 });
    }
    
    const parsedUserId = parseInt(userId);
    const parsedProfileId = parseInt(profileId);
    
    // Check if user has any profile assigned already
    const existingAssignments = await db.select().from(userPricingProfiles)
      .where(eq(userPricingProfiles.userId, parsedUserId));
    
    // If user already has a profile, update it
    if (existingAssignments.length > 0) {
      const [updatedAssignment] = await db.update(userPricingProfiles)
        .set({
          profileId: parsedProfileId,
          updatedAt: new Date()
        })
        .where(eq(userPricingProfiles.userId, parsedUserId))
        .returning();
      
      return NextResponse.json({ 
        message: "User's pricing profile updated successfully",
        assignment: updatedAssignment
      });
    }
    
    // Create new assignment if no existing one
    const [newAssignment] = await db.insert(userPricingProfiles).values({
      userId: parsedUserId,
      profileId: parsedProfileId,
    }).returning();
    
    return NextResponse.json({ 
      message: "User assigned to pricing profile successfully",
      assignment: newAssignment
    });
  } catch (error) {
    console.error("Error assigning user to pricing profile:", error);
    return NextResponse.json({ error: "Failed to assign user to pricing profile" }, { status: 500 });
  }
}

// DELETE method for removing a user from a pricing profile
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins and superadmins
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    // Get URL search parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const profileId = searchParams.get('profileId');
    
    if (!userId || !profileId || isNaN(parseInt(userId)) || isNaN(parseInt(profileId))) {
      return NextResponse.json({ error: "Valid user ID and profile ID are required" }, { status: 400 });
    }
    
    const parsedUserId = parseInt(userId);
    const parsedProfileId = parseInt(profileId);
    
    // Delete the assignment
    const deletedAssignment = await db.delete(userPricingProfiles)
      .where(and(
        eq(userPricingProfiles.userId, parsedUserId),
        eq(userPricingProfiles.profileId, parsedProfileId)
      ))
      .returning();
    
    if (deletedAssignment.length === 0) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: "User removed from pricing profile successfully",
      deletedAssignment: deletedAssignment[0]
    });
  } catch (error) {
    console.error("Error removing user from pricing profile:", error);
    return NextResponse.json({ error: "Failed to remove user from pricing profile" }, { status: 500 });
  }
}
