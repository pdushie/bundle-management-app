import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../../../lib/db";
import { userPricingProfiles } from "../../../../../../../lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../lib/auth";
import { and, eq } from "drizzle-orm";

// Add POST method to support client requests using POST
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string; userId: string }> }
) {
  const { profileId: profileIdParam, userId: userIdParam } = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins and superadmins to assign users to pricing profiles
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const profileId = parseInt(profileIdParam);
    const userId = parseInt(userIdParam);
    
    if (isNaN(profileId) || isNaN(userId)) {
      return NextResponse.json({ error: "Invalid profile ID or user ID" }, { status: 400 });
    }
    
    // Check if user has any profile assigned already
    const existingAssignments = await db.select().from(userPricingProfiles)
      .where(eq(userPricingProfiles.userId, userId));
    
    // If user already has a profile, update it
    if (existingAssignments.length > 0) {
      const [updatedAssignment] = await db.update(userPricingProfiles)
        .set({
          profileId,
          updatedAt: new Date()
        })
        .where(eq(userPricingProfiles.userId, userId))
        .returning();
      
      return NextResponse.json({ 
        message: "User's pricing profile updated successfully",
        assignment: updatedAssignment
      });
    }
    
    // Create new assignment if no existing one
    const [newAssignment] = await db.insert(userPricingProfiles).values({
      userId,
      profileId,
    }).returning();
    
    return NextResponse.json({ 
      message: "User assigned to pricing profile successfully",
      assignment: newAssignment
    });
  } catch (error) {
    console.error(`Error assigning user ${userIdParam} to pricing profile ${profileIdParam}:`, error);
    return NextResponse.json({ error: "Failed to assign user to pricing profile" }, { status: 500 });
  }
}

// Original PUT method also maintained for API consistency
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string; userId: string }> }
) {
  const { profileId: profileIdParam, userId: userIdParam } = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins and superadmins to assign users to pricing profiles
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const profileId = parseInt(profileIdParam);
    const userId = parseInt(userIdParam);
    
    if (isNaN(profileId) || isNaN(userId)) {
      return NextResponse.json({ error: "Invalid profile ID or user ID" }, { status: 400 });
    }
    
    // Check if user has any profile assigned already
    const existingAssignments = await db.select().from(userPricingProfiles)
      .where(eq(userPricingProfiles.userId, userId));
    
    // If user already has a profile, update it
    if (existingAssignments.length > 0) {
      const [updatedAssignment] = await db.update(userPricingProfiles)
        .set({
          profileId,
          updatedAt: new Date()
        })
        .where(eq(userPricingProfiles.userId, userId))
        .returning();
      
      return NextResponse.json({ 
        message: "User's pricing profile updated successfully",
        assignment: updatedAssignment
      });
    }
    
    // Create new assignment if no existing one
    const [newAssignment] = await db.insert(userPricingProfiles).values({
      userId,
      profileId,
    }).returning();
    
    return NextResponse.json({ 
      message: "User assigned to pricing profile successfully",
      assignment: newAssignment
    });
  } catch (error) {
    console.error(`Error assigning user ${userIdParam} to pricing profile ${profileIdParam}:`, error);
    return NextResponse.json({ error: "Failed to assign user to pricing profile" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string; userId: string }> }
) {
  const { profileId: profileIdParam, userId: userIdParam } = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins and superadmins to remove user assignments
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const profileId = parseInt(profileIdParam);
    const userId = parseInt(userIdParam);
    
    if (isNaN(profileId) || isNaN(userId)) {
      return NextResponse.json({ error: "Invalid profile ID or user ID" }, { status: 400 });
    }
    
    // Delete the assignment
    const deletedAssignment = await db.delete(userPricingProfiles)
      .where(and(
        eq(userPricingProfiles.userId, userId),
        eq(userPricingProfiles.profileId, profileId)
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
    console.error(`Error removing user ${userIdParam} from pricing profile ${profileIdParam}:`, error);
    return NextResponse.json({ error: "Failed to remove user from pricing profile" }, { status: 500 });
  }
}
