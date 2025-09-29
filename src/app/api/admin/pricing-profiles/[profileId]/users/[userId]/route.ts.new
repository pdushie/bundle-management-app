import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../../../lib/db";
import { userPricingProfiles } from "../../../../../../../lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../lib/auth";
import { and, eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: { profileId: string, userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins and superadmins to assign users to pricing profiles
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const profileId = parseInt(params.profileId);
    const userId = parseInt(params.userId);
    
    if (isNaN(profileId) || isNaN(userId)) {
      return NextResponse.json({ error: "Invalid profile ID or user ID" }, { status: 400 });
    }
    
    // Check if assignment already exists
    const existingAssignment = await db.select().from(userPricingProfiles)
      .where(and(
        eq(userPricingProfiles.userId, userId),
        eq(userPricingProfiles.profileId, profileId)
      ));
    
    if (existingAssignment.length > 0) {
      return NextResponse.json({ error: "User is already assigned to this pricing profile" }, { status: 400 });
    }
    
    // Check if user has another profile assigned already
    const otherAssignments = await db.select().from(userPricingProfiles)
      .where(eq(userPricingProfiles.userId, userId));
    
    // If user has another profile, update it instead of creating a new one
    if (otherAssignments.length > 0) {
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
    
    // Create new assignment
    const [newAssignment] = await db.insert(userPricingProfiles).values({
      userId,
      profileId,
    }).returning();
    
    return NextResponse.json({ 
      message: "User assigned to pricing profile successfully",
      assignment: newAssignment
    });
  } catch (error) {
    console.error(`Error assigning user ${params.userId} to pricing profile ${params.profileId}:`, error);
    return NextResponse.json({ error: "Failed to assign user to pricing profile" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { profileId: string, userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins and superadmins to remove user assignments
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const profileId = parseInt(params.profileId);
    const userId = parseInt(params.userId);
    
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
    console.error(`Error removing user ${params.userId} from pricing profile ${params.profileId}:`, error);
    return NextResponse.json({ error: "Failed to remove user from pricing profile" }, { status: 500 });
  }
}
