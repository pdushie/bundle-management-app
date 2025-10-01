import { PricingProfile, PricingTier } from './pricingUtils';

/**
 * Calculate the cost for an individual entry based on the applicable tier pricing
 * @param entry The entry to calculate the cost for
 * @param pricingProfile The pricing profile to use for calculation
 * @param tiers The pricing tiers for the profile
 * @returns The calculated cost for the entry
 */
export function calculateEntryCost(
  allocationGB: number, 
  pricingProfile: PricingProfile, 
  tiers: PricingTier[]
): number {
  // No base price or minimum charge - only using tier price
  let calculatedCost: number = 0;

  // Handle cases where tiers might not be available
  if (!tiers || tiers.length === 0) {
    console.error('No pricing tiers found for profile:', pricingProfile.name);
    throw new Error(`No pricing tiers available for profile: ${pricingProfile.name}`);
  }

  // Sort tiers by data size (smallest to largest)
  const sortedTiers = [...tiers].sort((a, b) => 
    parseFloat(a.dataGB) - parseFloat(b.dataGB)
  );
  
  // Find the exact tier for this allocation size
  let exactTier = sortedTiers.find(tier => 
    parseFloat(tier.dataGB) === allocationGB
  );
  
  if (exactTier) {
    // Exact tier match found, use its price
    calculatedCost = parseFloat(exactTier.price);
  } else {
    // Find the next higher tier
    let applicableTier = sortedTiers.find(tier => 
      parseFloat(tier.dataGB) > allocationGB
    );
    
    // If no higher tier, use the highest available tier
    if (!applicableTier && sortedTiers.length > 0) {
      applicableTier = sortedTiers[sortedTiers.length - 1];
    }
    
    if (applicableTier) {
      // Use the price from the applicable tier
      calculatedCost = parseFloat(applicableTier.price);
    } else {
      // This should never happen since we check for empty tiers at the beginning
      throw new Error(`Could not determine pricing tier for ${allocationGB}GB allocation`);
    }
  }

  // Round to 2 decimal places
  return Math.round(calculatedCost * 100) / 100;
}

/**
 * Calculate costs for all entries in an order
 * @param entries The order entries to calculate costs for
 * @param pricingProfile The pricing profile to use
 * @param tiers The pricing tiers for the profile
 * @returns Array of entries with costs added
 */
export function calculateEntryCosts(
  entries: Array<{ number: string; allocationGB: number; status?: string }>,
  pricingProfile: PricingProfile,
  tiers: PricingTier[]
): Array<{ number: string; allocationGB: number; status?: string; cost: number }> {
  return entries.map(entry => ({
    ...entry,
    cost: calculateEntryCost(entry.allocationGB, pricingProfile, tiers)
  }));
}
