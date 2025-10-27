import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { pricingProfiles, userPricingProfiles, pricingTiers } from "../../../../lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { eq } from "drizzle-orm";
import { getCurrentTime } from "../../../../lib/timeService";

export async function GET(req: NextRequest) {
  try {
    // Check if database is available
    if (!db) {
      // Console statement removed for security
      return NextResponse.json({ 
        error: 'Database connection unavailable'
      }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins, super_admins, and standard_admins to access pricing profiles
    if (session.user.role !== "admin" && session.user.role !== "super_admin" && session.user.role !== "standard_admin") {
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
    const profilesWithTiers = profiles.map(profile => {
      // Add validation to ensure profile has required fields
      if (!profile || !profile.id || !profile.name) {
        // Console statement removed for security
        return null;
      }
      
      return {
        ...profile,
        tiers: tiersByProfile[profile.id] || []
      };
    }).filter(Boolean); // Remove null profiles
    
    // Console log removed for security
    
    return NextResponse.json({ profiles: profilesWithTiers });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json({ error: "Failed to fetch pricing profiles" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check if database is available
    if (!db) {
      // Console statement removed for security
      return NextResponse.json({ 
        error: 'Database connection unavailable'
      }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins, super_admins, and standard_admins to create profiles or assign users
    if (session.user.role !== "admin" && session.user.role !== "super_admin" && session.user.role !== "standard_admin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const body = await req.json();
    
    // Determine if this is a profile creation or user assignment based on the request body
    if (body.name) {
      // This is a profile creation request
      const { 
        name, 
        description, 
        basePrice, 
        dataPricePerGB, 
        minimumCharge, 
        isActive, 
        isTiered, 
        tiers 
      } = body;
      
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
      
      // Create pricing profile - always with tiered pricing
      const [newProfile] = await db.insert(pricingProfiles).values({
        name,
        description,
        basePrice: "0", // Always use 0 for basePrice
        dataPricePerGB: null, // Always null since we only use tiered pricing
        minimumCharge: "0", // Always use 0 for minimumCharge
        isActive: isActive !== undefined ? isActive : true,
        isTiered: true, // Always use tiered pricing
      }).returning();
      
      // Insert tiers (always using tiered pricing)
      let newTiers: any[] = [];
      if (tiers && tiers.length > 0 && newProfile.id) {
        const tierValues = tiers.map((tier: any) => ({
          profileId: newProfile.id,
          dataGB: String(tier.dataGB),
          price: String(tier.price)
        }));
        
        newTiers = await db.insert(pricingTiers).values(tierValues).returning();
      }
      
      return NextResponse.json({
        message: "Pricing profile created successfully",
        profile: {
          ...newProfile,
          tiers: newTiers
        }
      });
    } else if (body.userId && body.profileId) {
      // This is a user assignment request
      const { userId, profileId } = body;
      
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
            updatedAt: await getCurrentTime()
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
    } else {
      return NextResponse.json({
        error: "Invalid request. Either provide profile details or user assignment information."
      }, { status: 400 });
    }
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json({ 
      error: "Failed to process request", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Check if database is available
    if (!db) {
      // Console statement removed for security
      return NextResponse.json({ 
        error: 'Database connection unavailable'
      }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins, super_admins, and standard_admins to update user assignments
    if (session.user.role !== "admin" && session.user.role !== "super_admin" && session.user.role !== "standard_admin") {
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
        updatedAt: await getCurrentTime()
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
    // Console statement removed for security
    return NextResponse.json({ error: "Failed to update user profile assignment" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Check if database is available
    if (!db) {
      // Console statement removed for security
      return NextResponse.json({ 
        error: 'Database connection unavailable'
      }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins, super_admins, and standard_admins to remove user assignments
    if (session.user.role !== "admin" && session.user.role !== "super_admin" && session.user.role !== "standard_admin") {
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
    // Console statement removed for security
    return NextResponse.json({ error: "Failed to remove user profile assignment" }, { status: 500 });
  }
}


