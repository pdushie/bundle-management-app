import { PricingProfile, PricingTier } from './pricingUtils';

/**
 * Check if pricing exists for a specific data allocation in the pricing profile
 * @param allocationGB The data allocation to check
 * @param tiers The pricing tiers for the profile
 * @returns true if exact pricing exists, false otherwise
 */
export function hasPricingForAllocation(
  allocationGB: number,
  tiers: PricingTier[]
): boolean {
  if (!tiers || tiers.length === 0) {
    return false;
  }
  
  // Check for exact tier match
  const exactTier = tiers.find(tier => 
    parseFloat(tier.dataGB) === allocationGB
  );
  
  return !!exactTier;
}

/**
 * Validate that all entries in an order have pricing available
 * @param entries The order entries to validate
 * @param tiers The pricing tiers for the profile
 * @returns Object with validation result and details
 */
export function validateOrderPricing(
  entries: Array<{ number: string; allocationGB: number }>,
  tiers: PricingTier[]
): { isValid: boolean; invalidEntries: Array<{ number: string; allocationGB: number; reason: string }> } {
  const invalidEntries: Array<{ number: string; allocationGB: number; reason: string }> = [];
  
  if (!tiers || tiers.length === 0) {
    return {
      isValid: false,
      invalidEntries: entries.map(entry => ({
        number: entry.number,
        allocationGB: entry.allocationGB,
        reason: 'No pricing tiers available in your pricing profile'
      }))
    };
  }
  
  for (const entry of entries) {
    if (!hasPricingForAllocation(entry.allocationGB, tiers)) {
      invalidEntries.push({
        number: entry.number,
        allocationGB: entry.allocationGB,
        reason: `No pricing available for ${entry.allocationGB}GB in your pricing profile`
      });
    }
  }
  
  return {
    isValid: invalidEntries.length === 0,
    invalidEntries
  };
}

/**
 * Calculate the cost for an individual entry based on exact tier pricing
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
  // Handle cases where tiers might not be available
  if (!tiers || tiers.length === 0) {
    // Console statement removed for security
    throw new Error(`No pricing tiers available for profile: ${pricingProfile.name}`);
  }

  // Find the exact tier for this allocation size
  const exactTier = tiers.find(tier => 
    parseFloat(tier.dataGB) === allocationGB
  );
  
  if (!exactTier) {
    throw new Error(`No pricing available for ${allocationGB}GB allocation in pricing profile: ${pricingProfile.name}`);
  }
  
  // Use exact tier price
  const calculatedCost = parseFloat(exactTier.price);
  
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

