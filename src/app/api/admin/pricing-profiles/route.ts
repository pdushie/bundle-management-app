import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { pricingProfiles, userPricingProfiles, pricingTiers } from "../../../../lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
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
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins and superadmins to create pricing profiles
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
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
    
    // Create pricing profile without using a transaction since Neon HTTP driver doesn't support them
    // Create pricing profile
    const [profile] = await db.insert(pricingProfiles).values({
      name,
      description,
      basePrice: basePrice.toString(),
      dataPricePerGB: isTiered ? null : dataPricePerGB.toString(),
      minimumCharge: minimumCharge ? minimumCharge.toString() : "0",
      isActive: isActive !== undefined ? isActive : true,
      isTiered: isTiered || false
    }).returning();
    
    // If tiered pricing, insert tiers
    if (isTiered && tiers && tiers.length > 0) {
      const tierValues = tiers.map((tier: any) => ({
        profileId: profile.id,
        dataGB: tier.dataGB.toString(),
        price: tier.price.toString()
      }));
      
      await db.insert(pricingTiers).values(tierValues);
    }
    
    // Get the tiers for the newly created profile
    const profileTiers = isTiered ? 
      await db.select().from(pricingTiers).where(eq(pricingTiers.profileId, profile.id)) :
      [];
    
    return NextResponse.json({ 
      profile: {
        ...profile,
        tiers: profileTiers
      } 
    });
  } catch (error) {
    console.error("Error creating pricing profile:", error);
    return NextResponse.json({ error: "Failed to create pricing profile" }, { status: 500 });
  }
}
