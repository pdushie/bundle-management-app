import { db } from './db';
import { pricingProfiles, userPricingProfiles, pricingTiers } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Interface for pricing tier
 */
export interface PricingTier {
  id?: number;
  profileId?: number;
  dataGB: string;
  price: string;
}

/**
 * Interface for pricing profile
 */
export interface PricingProfile {
  id: number;
  name: string;
  description: string | null;
  basePrice: string;
  dataPricePerGB: string | null;
  minimumCharge: string;
  isActive: boolean;
  isTiered?: boolean;
  tiers?: PricingTier[];
}

/**
 * Default pricing profile to use if a user doesn't have one assigned
 */
const DEFAULT_PRICING: PricingProfile = {
  id: 0,
  name: "Default",
  description: "Default pricing for users without a profile",
  basePrice: "10.00",
  dataPricePerGB: "5.00",
  minimumCharge: "10.00",
  isActive: true,
  isTiered: false
};

/**
 * Get the pricing profile for a user
 * @param userId The user ID to get the pricing profile for
 * @returns The user's pricing profile or the default profile if not found
 */
export async function getUserPricingProfile(userId: number): Promise<PricingProfile> {
  if (!userId) {
    return DEFAULT_PRICING;
  }

  try {
    // Get the user's pricing profile assignment
    const userProfile = await db.query.userPricingProfiles.findFirst({
      where: eq(userPricingProfiles.userId, userId),
      with: {
        profile: true
      }
    });

    // If user has a profile assigned and it's active, use it
    if (userProfile?.profile && userProfile.profile.isActive) {
      return userProfile.profile;
    }

    // Try to get the standard pricing profile
    const standardProfile = await db.select().from(pricingProfiles)
      .where(eq(pricingProfiles.name, 'Standard'))
      .limit(1);

    if (standardProfile.length > 0) {
      return standardProfile[0];
    }

    // If no standard profile found, get the first active profile
    const anyProfile = await db.select().from(pricingProfiles)
      .where(eq(pricingProfiles.isActive, true))
      .limit(1);

    if (anyProfile.length > 0) {
      return anyProfile[0];
    }

    // Fall back to default pricing
    return DEFAULT_PRICING;
  } catch (error) {
    console.error(`Error getting pricing profile for user ${userId}:`, error);
    return DEFAULT_PRICING;
  }
}

/**
 * Calculate the cost of an order based on the user's pricing profile
 * @param userId The user ID to calculate the cost for
 * @param totalData The total amount of data in GB
 * @returns The calculated cost
 */
export async function calculateOrderCost(userId: number, totalData: number): Promise<number> {
  try {
    // Get the user's pricing profile
    const pricingProfile = await getUserPricingProfile(userId);

    // Get pricing tiers if the profile is tiered
    let tiers: PricingTier[] = [];
    
    if (pricingProfile.isTiered) {
      tiers = await db.select().from(pricingTiers)
        .where(eq(pricingTiers.profileId, pricingProfile.id));
    }

    const basePrice = parseFloat(pricingProfile.basePrice);
    const minimumCharge = parseFloat(pricingProfile.minimumCharge);
    let calculatedCost: number;

    // Calculate cost based on pricing method
    if (pricingProfile.isTiered && tiers.length > 0) {
      // Tiered pricing logic
      // Sort tiers by data size
      const sortedTiers = [...tiers].sort((a, b) => 
        parseFloat(a.dataGB) - parseFloat(b.dataGB)
      );
      
      // Find the applicable tier (exact match or next higher tier)
      let applicableTier = sortedTiers.find(tier => 
        parseFloat(tier.dataGB) >= totalData
      );
      
      // If no suitable tier found, use the highest tier
      if (!applicableTier && sortedTiers.length > 0) {
        applicableTier = sortedTiers[sortedTiers.length - 1];
      }
      
      if (applicableTier) {
        calculatedCost = basePrice + parseFloat(applicableTier.price);
      } else {
        // Fallback if no tiers are defined
        calculatedCost = basePrice + (totalData * 5); // default rate
      }
    } else {
      // Formula-based pricing
      const dataPricePerGB = parseFloat(pricingProfile.dataPricePerGB || '5.00');
      calculatedCost = basePrice + (totalData * dataPricePerGB);
    }

    // Apply minimum charge if needed
    const finalCost = Math.max(calculatedCost, minimumCharge);

    // Round to 2 decimal places
    return Math.round(finalCost * 100) / 100;
  } catch (error) {
    console.error(`Error calculating order cost for user ${userId}:`, error);
    
    // Default calculation if error
    const defaultCost = 10 + (totalData * 5);
    return Math.round(defaultCost * 100) / 100;
  }
}

/**
 * Get all pricing profiles
 * @returns Array of all pricing profiles
 */
export async function getAllPricingProfiles(): Promise<PricingProfile[]> {
  try {
    const profiles = await db.select().from(pricingProfiles)
      .orderBy(pricingProfiles.name);
    
    return profiles;
  } catch (error) {
    console.error("Error fetching pricing profiles:", error);
    return [DEFAULT_PRICING];
  }
}
