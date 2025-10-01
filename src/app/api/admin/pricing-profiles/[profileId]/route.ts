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
    // Check if database is available
    if (!db) {
      console.error('Database connection is not available');
      return NextResponse.json({ 
        error: 'Database connection unavailable'
      }, { status: 500 });
    }

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
    if (
      db &&
      db.query &&
      'userPricingProfiles' in db.query &&
      typeof (db.query as any).userPricingProfiles?.findMany === 'function'
    ) {
      try {
        assignedUsers = await (db.query as any).userPricingProfiles.findMany({
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
      }
    }
    if (!assignedUsers) {
      // Fallback to direct SQL query
      const rawAssignedUsers = await db.execute(sql`
        SELECT upp.id, upp.user_id, upp.profile_id, upp.created_at,
               json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'role', u.role) as user
        FROM user_pricing_profiles upp
        JOIN users u ON upp.user_id = u.id
        WHERE upp.profile_id = ${profileId}
      `);
      assignedUsers = rawAssignedUsers.rows.map(row => ({
        ...row,
        user: row.user
      }));
    }
    
    // Modify the response to include user information directly
  const usersWithProfile = assignedUsers.map((up: any) => up.user);
    
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
    // Check if database is available
    if (!db) {
      console.error('Database connection is not available');
      return NextResponse.json({ 
        error: 'Database connection unavailable'
      }, { status: 500 });
    }

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
    const { name, description, isActive, tiers } = body;
    // We only use tiered pricing, so ignore basePrice, dataPricePerGB, minimumCharge, and isTiered
    
    // Basic validation
    if (!name) {
      return NextResponse.json({ 
        error: "Profile name is required" 
      }, { status: 400 });
    }
    
    // Validate that at least one tier is provided (always using tiered pricing)
    if (!tiers || tiers.length === 0) {
      return NextResponse.json({ 
        error: "At least one pricing tier is required" 
      }, { status: 400 });
    }
    
    // Check if profile exists
    const existingProfile = await db.select().from(pricingProfiles)
      .where(eq(pricingProfiles.id, profileId));
    
    if (existingProfile.length === 0) {
      return NextResponse.json({ error: "Pricing profile not found" }, { status: 404 });
    }
    
    // Update pricing profile without using a transaction since Neon HTTP driver doesn't support them
    // Update pricing profile - always with tiered pricing
    const [updatedProfile] = await db.update(pricingProfiles)
      .set({
        name,
        description,
        basePrice: "0", // Always use 0 for basePrice
        dataPricePerGB: null, // Always null since we only use tiered pricing
        minimumCharge: "0", // Always use 0 for minimumCharge
        isActive: isActive !== undefined ? isActive : true,
        isTiered: true, // Always use tiered pricing
        updatedAt: new Date(),
      })
      .where(eq(pricingProfiles.id, profileId))
      .returning();
    
    // Update the tiers (always using tiered pricing)
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
    
    // Get the updated tiers (always using tiered pricing)
    const updatedTiers = await db.select().from(pricingTiers).where(eq(pricingTiers.profileId, profileId));
    
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
    // Check if database is available
    if (!db) {
      console.error('Database connection is not available');
      return NextResponse.json({ 
        error: 'Database connection unavailable'
      }, { status: 500 });
    }

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
