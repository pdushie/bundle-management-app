import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { pricingProfiles, userPricingProfiles, pricingTiers } from "../../../../lib/schema";
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
    
    // Only allow admins and superadmins to access pricing profiles
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    // Get all pricing profiles
    const profiles = await db.select().from(pricingProfiles)
      .orderBy(pricingProfiles.name);
    
    // Get all tiers for all profiles
    const allTiers = await db.select().from(pricingTiers);
    
    // Group tiers by profileId
    const tiersByProfile: Record<number, any[]> = {};
    allTiers.forEach(tier => {
      if (!tiersByProfile[tier.profileId]) {
        tiersByProfile[tier.profileId] = [];
      }
      tiersByProfile[tier.profileId].push(tier);
    });
    
    // Add tiers to each profile
    const profilesWithTiers = profiles.map(profile => ({
      ...profile,
      tiers: tiersByProfile[profile.id] || []
    }));
    
    return NextResponse.json({ profiles: profilesWithTiers });
  } catch (error) {
    console.error("Error fetching pricing profiles:", error);
    return NextResponse.json({ error: "Failed to fetch pricing profiles" }, { status: 500 });
  }
}

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
    
    // Only allow admins and superadmins to assign users to profiles
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const body = await req.json();
    const { userId, profileId } = body;
    
    // Basic validation
    if (!userId || !profileId) {
      return NextResponse.json({ 
        error: "User ID and Profile ID are required" 
      }, { status: 400 });
    }
    
    const parsedUserId = parseInt(userId);
    const parsedProfileId = parseInt(profileId);
    
    if (isNaN(parsedUserId) || isNaN(parsedProfileId)) {
      return NextResponse.json({ 
        error: "Invalid User ID or Profile ID" 
      }, { status: 400 });
    }
    
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

export async function PUT(req: NextRequest) {
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
    
    // Only allow admins and superadmins to update user assignments
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const body = await req.json();
    const { userId, profileId } = body;
    
    // Basic validation
    if (!userId || !profileId) {
      return NextResponse.json({ 
        error: "User ID and Profile ID are required" 
      }, { status: 400 });
    }
    
    const parsedUserId = parseInt(userId);
    const parsedProfileId = parseInt(profileId);
    
    if (isNaN(parsedUserId) || isNaN(parsedProfileId)) {
      return NextResponse.json({ 
        error: "Invalid User ID or Profile ID" 
      }, { status: 400 });
    }
    
    // Update the user's profile assignment
    const [updatedAssignment] = await db.update(userPricingProfiles)
      .set({
        profileId: parsedProfileId,
        updatedAt: new Date()
      })
      .where(eq(userPricingProfiles.userId, parsedUserId))
      .returning();
    
    if (!updatedAssignment) {
      return NextResponse.json({ error: "User assignment not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: "User's pricing profile updated successfully",
      assignment: updatedAssignment
    });
  } catch (error) {
    console.error("Error updating user profile assignment:", error);
    return NextResponse.json({ error: "Failed to update user profile assignment" }, { status: 500 });
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
    
    // Only allow admins and superadmins to remove user assignments
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ 
        error: "User ID is required" 
      }, { status: 400 });
    }
    
    const parsedUserId = parseInt(userId);
    
    if (isNaN(parsedUserId)) {
      return NextResponse.json({ 
        error: "Invalid User ID" 
      }, { status: 400 });
    }
    
    // Delete the user's profile assignment
    const deletedAssignment = await db.delete(userPricingProfiles)
      .where(eq(userPricingProfiles.userId, parsedUserId))
      .returning();
    
    if (deletedAssignment.length === 0) {
      return NextResponse.json({ error: "User assignment not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: "User removed from pricing profile successfully",
      deletedAssignment: deletedAssignment[0]
    });
  } catch (error) {
    console.error("Error removing user profile assignment:", error);
    return NextResponse.json({ error: "Failed to remove user profile assignment" }, { status: 500 });
  }
}
