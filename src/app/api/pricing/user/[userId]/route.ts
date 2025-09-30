import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { userPricingProfiles, pricingProfiles, pricingTiers, users } from "../../../../../lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    // Fetch user's numeric ID from the database using their email
    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json({ error: "No email found in session" }, { status: 400 });
    }
    const userRecord = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
    if (userRecord.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const sessionUserId = userRecord[0].id;
    // Allow users to see their own pricing, and admins to see any user's pricing
    const userIdParam = parseInt(userId);
    if (
      isNaN(userIdParam) || 
      (sessionUserId !== userIdParam && 
       session.user.role !== "admin" && 
       session.user.role !== "superadmin")
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    // Get the user's pricing profile assignment
    const userProfile = await db.select({
      assignment: userPricingProfiles,
      profile: pricingProfiles
    })
    .from(userPricingProfiles)
    .innerJoin(pricingProfiles, eq(userPricingProfiles.profileId, pricingProfiles.id))
    .where(eq(userPricingProfiles.userId, userIdParam))
    .limit(1);
    
    if (userProfile.length === 0) {
      return NextResponse.json({ 
        hasProfile: false,
        message: "User has no pricing profile assigned" 
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
    console.error(`Error getting pricing profile for user ${userId}:`, error);
    return NextResponse.json({ error: "Failed to get user pricing profile" }, { status: 500 });
  }
}
