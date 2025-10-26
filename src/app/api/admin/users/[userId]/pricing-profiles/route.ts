import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../../lib/db";
import { userPricingProfiles, pricingProfiles } from "../../../../../../lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentTime } from "../../../../../../lib/timeService";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId: userIdParam } = await context.params;
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
    // Only allow admins, superadmins, or the user themselves to access their pricing profiles
    // Use email for identity check since id is not present
    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    if (
      session.user.role !== "admin" && 
      session.user.role !== "super_admin" && 
      session.user.email !== userIdParam // assuming userIdParam is email, otherwise adjust accordingly
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    // Get all pricing profiles assigned to this user using direct SQL to avoid relational issues
    let assignedProfiles;
    try {
      // Try direct SQL approach first
      const rawAssignedProfiles = await db.execute(sql`
        SELECT upp.id as assignment_id, upp.created_at as assigned_at,
               pp.id, pp.name, pp.description, pp.base_price, pp.data_price_per_gb, 
               pp.minimum_charge, pp.is_active, pp.is_tiered
        FROM user_pricing_profiles upp
        JOIN pricing_profiles pp ON upp.profile_id = pp.id
        WHERE upp.user_id = ${userId}
      `);
      
      assignedProfiles = rawAssignedProfiles.rows;
    } catch (sqlError) {
      console.warn('SQL query failed, falling back to separate queries:', sqlError);
      
      // Fallback to separate queries
      const userAssignments = await db.select().from(userPricingProfiles)
        .where(eq(userPricingProfiles.userId, userId));
      
      assignedProfiles = [];
      for (const assignment of userAssignments) {
        const profile = await db.select().from(pricingProfiles)
          .where(eq(pricingProfiles.id, assignment.profileId))
          .limit(1);
        
        if (profile.length > 0) {
          assignedProfiles.push({
            assignment_id: assignment.id,
            assigned_at: assignment.createdAt,
            id: profile[0].id,
            name: profile[0].name,
            description: profile[0].description,
            base_price: profile[0].basePrice,
            data_price_per_gb: profile[0].dataPricePerGB,
            minimum_charge: profile[0].minimumCharge,
            is_active: profile[0].isActive,
            is_tiered: profile[0].isTiered
          });
        }
      }
    }
    
    // Map to a cleaner response format
    const profiles = assignedProfiles.map(assignment => ({
      id: assignment.id,
      name: assignment.name,
      description: assignment.description,
      basePrice: assignment.base_price,
      dataPricePerGB: assignment.data_price_per_gb,
      minimumCharge: assignment.minimum_charge,
      isActive: assignment.is_active,
      isTiered: assignment.is_tiered,
      assignmentId: assignment.assignment_id,
      assignedAt: assignment.assigned_at
    }));
    
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error(`Error fetching pricing profiles for user ${userIdParam}:`, error);
    return NextResponse.json({ error: "Failed to fetch pricing profiles" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId: userIdParam } = await context.params;
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
    if (session.user.role !== "admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    // Use a different variable name to avoid redeclaration
    const parsedUserId = parseInt(userIdParam);
    if (isNaN(parsedUserId)) {
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
      .where(and(
        eq(userPricingProfiles.userId, parsedUserId),
        eq(userPricingProfiles.profileId, parsedProfileId)
      ));
    
    if (existingAssignment.length > 0) {
      return NextResponse.json({ 
        error: "User is already assigned to this pricing profile",
        assignment: existingAssignment[0]
      }, { status: 400 });
    }
    
    // Check if user has another profile assigned already
    const otherAssignments = await db.select().from(userPricingProfiles)
      .where(eq(userPricingProfiles.userId, parsedUserId));
    
    // If user has another profile, update it instead of creating a new one
    if (otherAssignments.length > 0) {
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
    }
    
    // Create new assignment
    const [newAssignment] = await db.insert(userPricingProfiles).values({
      userId: parsedUserId,
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
