import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../../lib/db";
import { userPricingProfiles, pricingProfiles } from "../../../../../../lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Access params properly - we need to await the params object
    const resolvedParams = await Promise.resolve(params);
    const userIdParam = resolvedParams.userId;
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Parse userId after ensuring params is resolved
    const userId = parseInt(userIdParam);
    
    // Only allow admins, superadmins, or the user themselves to access their pricing profiles
    if (
      session.user.role !== "admin" && 
      session.user.role !== "superadmin" && 
      session.user.id !== userId
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    
    // Get all pricing profiles assigned to this user
    const assignedProfiles = await db.query.userPricingProfiles.findMany({
      where: eq(userPricingProfiles.userId, userId),
      with: {
        profile: true
      }
    });
    
    // Map to a cleaner response format
    const profiles = assignedProfiles.map(assignment => ({
      id: assignment.profile.id,
      name: assignment.profile.name,
      description: assignment.profile.description,
      basePrice: assignment.profile.basePrice,
      dataPricePerGB: assignment.profile.dataPricePerGB,
      minimumCharge: assignment.profile.minimumCharge,
      isActive: assignment.profile.isActive,
      isTiered: assignment.profile.isTiered,
      assignmentId: assignment.id,
      assignedAt: assignment.createdAt
    }));
    
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error(`Error fetching pricing profiles for user ${userIdParam}:`, error);
    return NextResponse.json({ error: "Failed to fetch pricing profiles" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Access params properly - we need to await the params object
    const resolvedParams = await Promise.resolve(params);
    const userIdParam = resolvedParams.userId;
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins and superadmins to assign pricing profiles to users
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const userId = parseInt(userIdParam);
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    
    // Get request body
    const body = await req.json();
    const { profileId } = body;
    
    if (!profileId || isNaN(parseInt(profileId))) {
      return NextResponse.json({ error: "Valid profile ID is required" }, { status: 400 });
    }
    
    const parsedProfileId = parseInt(profileId);
    
    // Check if profile exists
    const profile = await db.select().from(pricingProfiles)
      .where(eq(pricingProfiles.id, parsedProfileId))
      .limit(1);
    
    if (profile.length === 0) {
      return NextResponse.json({ error: "Pricing profile not found" }, { status: 404 });
    }
    
    // Check if assignment already exists
    const existingAssignment = await db.select().from(userPricingProfiles)
      .where(
        eq(userPricingProfiles.userId, userId),
        eq(userPricingProfiles.profileId, parsedProfileId)
      );
    
    if (existingAssignment.length > 0) {
      return NextResponse.json({ 
        error: "User is already assigned to this pricing profile",
        assignment: existingAssignment[0]
      }, { status: 400 });
    }
    
    // Check if user has another profile assigned already
    const otherAssignments = await db.select().from(userPricingProfiles)
      .where(eq(userPricingProfiles.userId, userId));
    
    // If user has another profile, update it instead of creating a new one
    if (otherAssignments.length > 0) {
      const [updatedAssignment] = await db.update(userPricingProfiles)
        .set({
          profileId: parsedProfileId,
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
      profileId: parsedProfileId,
    }).returning();
    
    return NextResponse.json({ 
      message: "User assigned to pricing profile successfully",
      assignment: newAssignment
    });
  } catch (error) {
    console.error(`Error assigning pricing profile to user ${userIdParam}:`, error);
    return NextResponse.json({ error: "Failed to assign pricing profile to user" }, { status: 500 });
  }
}
