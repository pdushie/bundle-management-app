import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { userPricingProfiles, pricingProfiles, pricingTiers, users } from "../../../../lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { eq } from "drizzle-orm";

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
    
    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json({ error: "No email found in session" }, { status: 400 });
    }
    
    // Fetch user's numeric ID from the database
    const userRecord = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
    if (userRecord.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = userRecord[0].id;
    
    // Get the user's pricing profile assignment
    const userProfile = await db.select({
      assignment: userPricingProfiles,
      profile: pricingProfiles
    })
    .from(userPricingProfiles)
    .innerJoin(pricingProfiles, eq(userPricingProfiles.profileId, pricingProfiles.id))
    .where(eq(userPricingProfiles.userId, userId))
    .limit(1);
    
    if (userProfile.length === 0) {
      return NextResponse.json({ 
        hasProfile: false,
        message: "You don't have a pricing profile assigned" 
      });
    }
    
    const profileData = userProfile[0].profile;
    
    // If tiered pricing, get the tiers
    let tiers: Array<{ id: number; profileId: number; dataGB: string; price: string; createdAt: Date | null; updatedAt: Date | null }> = [];
    if (profileData.isTiered) {
      tiers = await db.select().from(pricingTiers)
        .where(eq(pricingTiers.profileId, profileData.id))
        .orderBy(pricingTiers.dataGB);
    }
    
    return NextResponse.json({
      hasProfile: true,
      profile: {
        ...profileData,
        tiers
      },
      assignmentId: userProfile[0].assignment.id,
      assignedAt: userProfile[0].assignment.createdAt,
    });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json({ error: "Failed to get pricing profile" }, { status: 500 });
  }
}

