import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { pricingProfiles, userPricingProfiles } from "../../../../../lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { and, eq } from "drizzle-orm";

// Use the standard Next.js App Router pattern for route handlers
export async function GET(
  req: NextRequest,
  { params }: { params: { profileId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins and superadmins to access pricing profiles
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const profileId = parseInt(params.profileId);
    
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
    
    // Get all users assigned to this profile
    const assignedUsers = await db.query.userPricingProfiles.findMany({
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
    
    // Modify the response to include user information directly
    const usersWithProfile = assignedUsers.map(up => up.user);
    
    return NextResponse.json({ 
      profile: profile[0],
      assignedUsers: usersWithProfile
    });
  } catch (error) {
    console.error(`Error fetching pricing profile ${params.profileId}:`, error);
    return NextResponse.json({ error: "Failed to fetch pricing profile" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { profileId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins and superadmins to update pricing profiles
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const profileId = parseInt(params.profileId);
    
    if (isNaN(profileId)) {
      return NextResponse.json({ error: "Invalid profile ID" }, { status: 400 });
    }
    
    const body = await req.json();
    const { name, description, basePrice, dataPricePerGB, minimumCharge, isActive } = body;
    
    // Basic validation
    if (!name || basePrice === undefined || dataPricePerGB === undefined) {
      return NextResponse.json({ 
        error: "Name, base price, and data price per GB are required" 
      }, { status: 400 });
    }
    
    // Check if profile exists
    const existingProfile = await db.select().from(pricingProfiles)
      .where(eq(pricingProfiles.id, profileId));
    
    if (existingProfile.length === 0) {
      return NextResponse.json({ error: "Pricing profile not found" }, { status: 404 });
    }
    
    // Update pricing profile
    const [updatedProfile] = await db.update(pricingProfiles)
      .set({
        name,
        description,
        basePrice: basePrice.toString(),
        dataPricePerGB: dataPricePerGB.toString(),
        minimumCharge: minimumCharge ? minimumCharge.toString() : "0",
        isActive: isActive !== undefined ? isActive : true,
        updatedAt: new Date(),
      })
      .where(eq(pricingProfiles.id, profileId))
      .returning();
    
    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error(`Error updating pricing profile ${params.profileId}:`, error);
    return NextResponse.json({ error: "Failed to update pricing profile" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { profileId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow superadmins to delete pricing profiles
    if (session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const profileId = parseInt(params.profileId);
    
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
    console.error(`Error deleting pricing profile ${params.profileId}:`, error);
    return NextResponse.json({ error: "Failed to delete pricing profile" }, { status: 500 });
  }
}
