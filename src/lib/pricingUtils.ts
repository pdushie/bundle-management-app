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
  basePrice: "0.00",  // Not used, but required by interface
  dataPricePerGB: null, // Not used with tiered pricing
  minimumCharge: "0.00", // Not used, but required by interface
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
 * @param allowDefault Whether to return default pricing if no profile assigned (default: true for backwards compatibility)
 * @returns The user's pricing profile, default profile, or null if not found and allowDefault is false
 */
export async function getUserPricingProfile(userId: number, allowDefault: boolean = true): Promise<PricingProfile | null> {
  if (!userId) {
    return allowDefault ? DEFAULT_PRICING : null;
  }

  // Check if database is available
  if (!db) {
    // Console statement removed for security
    return allowDefault ? DEFAULT_PRICING : null;
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

    // If allowDefault is false, return null when no specific profile is assigned
    if (!allowDefault) {
      return null;
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
    // Console statement removed for security
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
      // Console statement removed for security
      // Use default calculation
      const defaultCost = 10 + (totalData * 5);
      return Math.round(defaultCost * 100) / 100;
    }

    // Get the user's pricing profile
    const pricingProfile = await getUserPricingProfile(userId);
    
    if (!pricingProfile) {
      throw new Error('No pricing profile available for cost calculation');
    }

    // Get pricing tiers if the profile is tiered
    let tiers: PricingTier[] = [];
    
    if (pricingProfile.isTiered) {
      tiers = await db.select().from(pricingTiers)
        .where(eq(pricingTiers.profileId, pricingProfile.id));
    }

    // No base price or minimum charge - only using tier price
    let calculatedCost: number;

    // Handle cases where tiers might not be available yet
    if (tiers.length === 0) {
      // Console statement removed for security
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
      calculatedCost = parseFloat(exactTier.price);
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
        calculatedCost = parseFloat(applicableTier.price);
      } else {
        // This should never happen since we check for empty tiers at the beginning
        throw new Error(`Could not determine pricing tier for ${totalData}GB allocation`);
      }
    }

    // No minimum charge - just use the tier price
    const finalCost = calculatedCost;

    // Round to 2 decimal places
    return Math.round(finalCost * 100) / 100;
  } catch (error) {
    // Console statement removed for security
    
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
      // Console statement removed for security
      return [DEFAULT_PRICING];
    }

    const profiles = await db.select().from(pricingProfiles)
      .orderBy(pricingProfiles.name);
    
    return profiles;
  } catch (error) {
    // Console statement removed for security
    return [DEFAULT_PRICING];
  }
}

