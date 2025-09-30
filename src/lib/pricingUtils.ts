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
  dataPricePerGB: null, // No longer used with tier-only pricing
  minimumCharge: "10.00",
  isActive: true,
  isTiered: true, // Always use tiered pricing
  tiers: [
    { dataGB: "1", price: "5.00" },
    { dataGB: "2", price: "10.00" },
    { dataGB: "5", price: "25.00" },
    { dataGB: "10", price: "50.00" }
  ]
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

  // Check if database is available
  if (!db) {
    console.error('Database connection is not available');
    return DEFAULT_PRICING;
  }

  try {
    // Use direct queries instead of relational queries to avoid potential issues
    const userProfileAssignments = await db.select().from(userPricingProfiles)
      .where(eq(userPricingProfiles.userId, userId))
      .limit(1);

    // If user has a profile assigned, get the profile details
    if (userProfileAssignments.length > 0) {
      const profileId = userProfileAssignments[0].profileId;
      const profiles = await db.select().from(pricingProfiles)
        .where(eq(pricingProfiles.id, profileId))
        .limit(1);

      if (profiles.length > 0 && profiles[0].isActive) {
        // Force the profile to be tiered
        return {
          ...profiles[0],
          isTiered: true
        };
      }
    }

    // Try to get the standard pricing profile
    const standardProfile = await db.select().from(pricingProfiles)
      .where(eq(pricingProfiles.name, 'Standard'))
      .limit(1);

    if (standardProfile.length > 0) {
      // Force the profile to be tiered
      return {
        ...standardProfile[0],
        isTiered: true
      };
    }

    // If no standard profile found, get the first active profile
    const anyProfile = await db.select().from(pricingProfiles)
      .where(eq(pricingProfiles.isActive, true))
      .limit(1);

    if (anyProfile.length > 0) {
      // Force the profile to be tiered
      return {
        ...anyProfile[0],
        isTiered: true
      };
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
    // Check if database is available
    if (!db) {
      console.error('Database connection is not available');
      // Use default calculation
      const defaultCost = 10 + (totalData * 5);
      return Math.round(defaultCost * 100) / 100;
    }

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

    // Handle cases where tiers might not be available yet
    if (tiers.length === 0) {
      console.error('No pricing tiers found for profile:', pricingProfile.name);
      throw new Error(`No pricing tiers available for profile: ${pricingProfile.name}`);
    }

    // Always use tiered pricing logic
    // Sort tiers by data size
    const sortedTiers = [...tiers].sort((a, b) => 
      parseFloat(a.dataGB) - parseFloat(b.dataGB)
    );
    
    // Find exact tier match if possible
    let exactTier = sortedTiers.find(tier => 
      parseFloat(tier.dataGB) === totalData
    );
    
    if (exactTier) {
      calculatedCost = basePrice + parseFloat(exactTier.price);
    } else {
      // Find the next higher tier
      let applicableTier = sortedTiers.find(tier => 
        parseFloat(tier.dataGB) > totalData
      );
      
      // If no higher tier, use the highest tier
      if (!applicableTier && sortedTiers.length > 0) {
        applicableTier = sortedTiers[sortedTiers.length - 1];
      }
      
      if (applicableTier) {
        calculatedCost = basePrice + parseFloat(applicableTier.price);
      } else {
        // This should never happen since we check for empty tiers at the beginning
        throw new Error(`Could not determine pricing tier for ${totalData}GB allocation`);
      }
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
    // Check if database is available
    if (!db) {
      console.error('Database connection is not available');
      return [DEFAULT_PRICING];
    }

    const profiles = await db.select().from(pricingProfiles)
      .orderBy(pricingProfiles.name);
    
    return profiles;
  } catch (error) {
    console.error("Error fetching pricing profiles:", error);
    return [DEFAULT_PRICING];
  }
}
