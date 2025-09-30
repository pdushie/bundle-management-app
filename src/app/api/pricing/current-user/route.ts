import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { userPricingProfiles, pricingProfiles, pricingTiers } from "../../../../lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    const userId = session.user.email;
    
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
    let tiers = [];
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
    console.error("Error getting current user pricing profile:", error);
    return NextResponse.json({ error: "Failed to get pricing profile" }, { status: 500 });
  }
}
