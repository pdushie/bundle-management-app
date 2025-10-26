import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { userPricingProfiles, pricingProfiles, users } from "../../../../lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { eq, and } from "drizzle-orm";
import { getCurrentTime } from "../../../../lib/timeService";

export async function POST(req: NextRequest) {
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
    
    // Only allow admins, super_admins, and standard_admins to assign pricing profiles to users
    if (session.user.role !== "admin" && session.user.role !== "super_admin" && session.user.role !== "standard_admin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    // Get request body
    const body = await req.json();
    const { userId, profileId } = body;
    
    if (!userId || !profileId) {
      return NextResponse.json({ error: "User ID and Profile ID are required" }, { status: 400 });
    }
    
    const parsedUserId = parseInt(userId);
    const parsedProfileId = parseInt(profileId);
    
    if (isNaN(parsedUserId) || isNaN(parsedProfileId)) {
      return NextResponse.json({ error: "Invalid user ID or profile ID" }, { status: 400 });
    }
    
    // Check if user and profile exist
    const user = await db.select().from(users)
      .where(eq(users.id, parsedUserId))
      .limit(1);
    
    if (user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const profile = await db.select().from(pricingProfiles)
      .where(eq(pricingProfiles.id, parsedProfileId))
      .limit(1);
    
    if (profile.length === 0) {
      return NextResponse.json({ error: "Pricing profile not found" }, { status: 404 });
    }
    
    // Check if user already has this profile
    const existingAssignment = await db.select().from(userPricingProfiles)
      .where(
        and(
          eq(userPricingProfiles.userId, parsedUserId),
          eq(userPricingProfiles.profileId, parsedProfileId)
        )
      );
    
    if (existingAssignment.length > 0) {
      return NextResponse.json({ 
        error: "User is already assigned to this pricing profile",
        assignment: existingAssignment[0]
      }, { status: 400 });
    }
    
    // Check if user has any other pricing profile
    const existingUserProfiles = await db.select().from(userPricingProfiles)
      .where(eq(userPricingProfiles.userId, parsedUserId));
    
    // If user already has a pricing profile, update it
    if (existingUserProfiles.length > 0) {
      const [updatedAssignment] = await db.update(userPricingProfiles)
        .set({
          profileId: parsedProfileId,
          updatedAt: await getCurrentTime()
        })
        .where(eq(userPricingProfiles.userId, parsedUserId))
        .returning();
      
      return NextResponse.json({
        message: "User's pricing profile updated successfully",
        assignment: updatedAssignment
      });
    } else {
      // Create a new assignment
      const [newAssignment] = await db.insert(userPricingProfiles)
        .values({
          userId: parsedUserId,
          profileId: parsedProfileId
        })
        .returning();
      
      return NextResponse.json({
        message: "User assigned to pricing profile successfully",
        assignment: newAssignment
      });
    }
  } catch (error) {
    console.error("Error assigning pricing profile to user:", error);
    return NextResponse.json({ error: "Failed to assign pricing profile to user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
    
    // Only allow admins, super_admins, and standard_admins to remove pricing profiles from users
    if (session.user.role !== "admin" && session.user.role !== "super_admin" && session.user.role !== "standard_admin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    // Get the assignment ID from URL search params
    const assignmentId = req.nextUrl.searchParams.get("id");
    
    if (!assignmentId) {
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
    }
    
    const parsedAssignmentId = parseInt(assignmentId);
    
    if (isNaN(parsedAssignmentId)) {
      return NextResponse.json({ error: "Invalid assignment ID" }, { status: 400 });
    }
    
    // Delete the assignment
    const deletedAssignment = await db.delete(userPricingProfiles)
      .where(eq(userPricingProfiles.id, parsedAssignmentId))
      .returning();
    
    if (deletedAssignment.length === 0) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    
    return NextResponse.json({
      message: "Pricing profile assignment removed successfully",
      deletedAssignment: deletedAssignment[0]
    });
  } catch (error) {
    console.error("Error removing pricing profile assignment:", error);
    return NextResponse.json({ error: "Failed to remove pricing profile assignment" }, { status: 500 });
  }
}
