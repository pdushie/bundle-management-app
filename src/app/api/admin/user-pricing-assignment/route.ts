import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { userPricingProfiles } from "../../../../../lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { and, eq } from "drizzle-orm";

/**
 * Assigns or updates a user's pricing profile
 */
export async function POST(req: NextRequest) {
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
    const body = await req.json();
    const { userId, profileId } = body;
    
    if (!userId || !profileId || isNaN(userId) || isNaN(profileId)) {
      return NextResponse.json({ error: "Invalid user ID or profile ID" }, { status: 400 });
    }
    
    // Check if user already has this profile
    const existingAssignment = await db.select().from(userPricingProfiles)
      .where(and(
        eq(userPricingProfiles.userId, userId),
        eq(userPricingProfiles.profileId, profileId)
      ));
    
    if (existingAssignment.length > 0) {
      return NextResponse.json({ 
        message: "User already has this pricing profile",
        assignment: existingAssignment[0]
      });
    }
    
    // Check if user has any other pricing profile
    const userProfiles = await db.select().from(userPricingProfiles)
      .where(eq(userPricingProfiles.userId, userId));
    
    if (userProfiles.length > 0) {
      // Update existing profile instead of creating a new one
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
      profileId
    }).returning();
    
    return NextResponse.json({
      message: "User assigned to pricing profile successfully",
      assignment: newAssignment
    });
  } catch (error) {
    console.error("Error assigning pricing profile:", error);
    return NextResponse.json({ error: "Failed to assign pricing profile" }, { status: 500 });
  }
}

/**
 * Removes a user's pricing profile assignment
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins and superadmins
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    // Get request URL parameters
    const url = new URL(req.url);
    const userId = parseInt(url.searchParams.get('userId') || '');
    const profileId = parseInt(url.searchParams.get('profileId') || '');
    
    if (isNaN(userId) || isNaN(profileId)) {
      return NextResponse.json({ error: "Invalid user ID or profile ID" }, { status: 400 });
    }
    
    // Delete the assignment
    const deleted = await db.delete(userPricingProfiles)
      .where(and(
        eq(userPricingProfiles.userId, userId),
        eq(userPricingProfiles.profileId, profileId)
      ))
      .returning();
    
    if (deleted.length === 0) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: "Pricing profile assignment removed successfully"
    });
  } catch (error) {
    console.error("Error removing pricing profile assignment:", error);
    return NextResponse.json({ error: "Failed to remove pricing profile assignment" }, { status: 500 });
  }
}
