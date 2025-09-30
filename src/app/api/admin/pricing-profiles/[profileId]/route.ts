import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { pricingProfiles, userPricingProfiles, pricingTiers } from "../../../../../lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { and, eq, sql } from "drizzle-orm";

// Use the standard Next.js App Router pattern for route handlers
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId: profileIdRaw } = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins and superadmins to access pricing profiles
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const profileId = parseInt(profileIdRaw);
    
    if (isNaN(profileId)) {
      return NextResponse.json({ error: "Invalid profile ID" }, { status: 400 });
    }
    
    // Get the pricing profile
    const profile = await db.select().from(pricingProfiles)
      .where(eq(pricingProfiles.id, profileId))
      .limit(1);
    
    if (profile.length === 0) {
      return NextResponse.json({ error: "Pricing profile not found" }, { status: 404 });
    }
    
    // Get pricing tiers if this is a tiered pricing profile
    const tiers = await db.select().from(pricingTiers)
      .where(eq(pricingTiers.profileId, profileId));
    
    // Get all users assigned to this profile
    let assignedUsers;
    try {
      assignedUsers = await db.query.userPricingProfiles.findMany({
        where: eq(userPricingProfiles.profileId, profileId),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          }
        }
      });
    } catch (error) {
      console.warn('Error using ORM query, falling back to direct SQL query:', error);
      // Fallback to direct SQL query
      const rawAssignedUsers = await db.execute(sql`
        SELECT upp.id, upp.user_id, upp.profile_id, upp.created_at,
               json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'role', u.role) as user
        FROM user_pricing_profiles upp
        JOIN users u ON upp.user_id = u.id
        WHERE upp.profile_id = ${profileId}
      `);
      assignedUsers = rawAssignedUsers.map(row => ({
        ...row,
        user: row.user
      }));
    }
    
    // Modify the response to include user information directly
    const usersWithProfile = assignedUsers.map(up => up.user);
    
    return NextResponse.json({ 
      profile: {
        ...profile[0],
        tiers
      },
      assignedUsers: usersWithProfile
    });
  } catch (error) {
    const { profileId: profileIdRaw } = await context.params;
    console.error(`Error fetching pricing profile ${profileIdRaw || ''}:`, error);
    return NextResponse.json({ error: "Failed to fetch pricing profile" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId: profileIdRaw } = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins and superadmins to update pricing profiles
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const profileId = parseInt(profileIdRaw);
    
    if (isNaN(profileId)) {
      return NextResponse.json({ error: "Invalid profile ID" }, { status: 400 });
    }
    
    const body = await req.json();
    const { name, description, basePrice, dataPricePerGB, minimumCharge, isActive, isTiered, tiers } = body;
    
    // Basic validation
    if (!name || basePrice === undefined) {
      return NextResponse.json({ 
        error: "Name and base price are required" 
      }, { status: 400 });
    }
    
    // Validate that dataPricePerGB is provided for non-tiered pricing
    if (!isTiered && dataPricePerGB === undefined) {
      return NextResponse.json({ 
        error: "Data price per GB is required for formula-based pricing" 
      }, { status: 400 });
    }
    
    // Validate that at least one tier is provided for tiered pricing
    if (isTiered && (!tiers || tiers.length === 0)) {
      return NextResponse.json({ 
        error: "At least one pricing tier is required for tiered pricing" 
      }, { status: 400 });
    }
    
    // Check if profile exists
    const existingProfile = await db.select().from(pricingProfiles)
      .where(eq(pricingProfiles.id, profileId));
    
    if (existingProfile.length === 0) {
      return NextResponse.json({ error: "Pricing profile not found" }, { status: 404 });
    }
    
    // Update pricing profile without using a transaction since Neon HTTP driver doesn't support them
    // Update pricing profile
    const [updatedProfile] = await db.update(pricingProfiles)
      .set({
        name,
        description,
        basePrice: basePrice.toString(),
        dataPricePerGB: isTiered ? null : dataPricePerGB.toString(),
        minimumCharge: minimumCharge ? minimumCharge.toString() : "0",
        isActive: isActive !== undefined ? isActive : true,
        isTiered: isTiered || false,
        updatedAt: new Date(),
      })
      .where(eq(pricingProfiles.id, profileId))
      .returning();
    
    // If tiered pricing, delete old tiers and insert new ones
    if (isTiered) {
      // Delete existing tiers
      await db.delete(pricingTiers)
        .where(eq(pricingTiers.profileId, profileId));
      
      // Insert new tiers
      if (tiers && tiers.length > 0) {
        const tierValues = tiers.map((tier: any) => ({
          profileId,
          dataGB: tier.dataGB.toString(),
          price: tier.price.toString()
        }));
        
        await db.insert(pricingTiers).values(tierValues);
      }
    } else {
      // If switching from tiered to formula-based, delete any existing tiers
      await db.delete(pricingTiers)
        .where(eq(pricingTiers.profileId, profileId));
    }
    
    // Get the updated tiers
    const updatedTiers = isTiered ? 
      await db.select().from(pricingTiers).where(eq(pricingTiers.profileId, profileId)) :
      [];
    
    return NextResponse.json({ 
      profile: {
        ...updatedProfile,
        tiers: updatedTiers
      } 
    });
  } catch (error) {
    const { profileId: profileIdRaw } = await context.params;
    console.error(`Error updating pricing profile ${profileIdRaw}:`, error);
    return NextResponse.json({ error: "Failed to update pricing profile" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId: profileIdRaw } = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow superadmins to delete pricing profiles
    if (session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const profileId = parseInt(profileIdRaw);
    
    if (isNaN(profileId)) {
      return NextResponse.json({ error: "Invalid profile ID" }, { status: 400 });
    }
    
    // Check if the profile is assigned to any users
    const assignedUsers = await db.select().from(userPricingProfiles)
      .where(eq(userPricingProfiles.profileId, profileId));
    
    if (assignedUsers.length > 0) {
      return NextResponse.json({ 
        error: "Cannot delete a pricing profile that is assigned to users",
        assignedUsersCount: assignedUsers.length
      }, { status: 400 });
    }
    
    // Delete the profile and its tiers without using a transaction
    // Delete associated tiers first
    await db.delete(pricingTiers)
      .where(eq(pricingTiers.profileId, profileId));
    
    // Delete the profile
    const deletedProfile = await db.delete(pricingProfiles)
      .where(eq(pricingProfiles.id, profileId))
      .returning();
    
    if (deletedProfile.length === 0) {
      return NextResponse.json({ error: "Pricing profile not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: "Pricing profile deleted successfully",
      deletedProfile: deletedProfile[0]
    });
  } catch (error) {
    const { profileId: profileIdRaw } = await context.params;
    console.error(`Error deleting pricing profile ${profileIdRaw}:`, error);
    return NextResponse.json({ error: "Failed to delete pricing profile" }, { status: 500 });
  }
}
