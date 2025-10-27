/**
 * Client-side utility functions for working with the pricing API
 */

// Types based on the schema
export interface PricingTier {
  id: number;
  profileId: number;
  dataGB: string; // Using string since we're using decimal with mode: 'string'
  price: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingProfile {
  id: number;
  name: string;
  description: string | null;
  basePrice: string;
  dataPricePerGB?: string;
  minimumCharge: string;
  isActive: boolean;
  isTiered: boolean;
  tiers?: PricingTier[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPricingAssignment {
  id: number;
  userId: number;
  profileId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPricingResponse {
  hasProfile: boolean;
  profile?: PricingProfile;
  assignmentId?: number;
  assignedAt?: Date;
  message?: string;
}

/**
 * Fetch the current user's pricing profile
 * @returns {Promise<UserPricingResponse>} The pricing profile data
 */
export async function getCurrentUserPricing(): Promise<UserPricingResponse> {
  const response = await fetch('/api/pricing/current-user');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch pricing');
  }
  
  return response.json();
}

/**
 * Fetch a specific user's pricing profile (admin only)
 * @param {number} userId - The user ID to fetch pricing for
 * @returns {Promise<UserPricingResponse>} The pricing profile data
 */
export async function getUserPricing(userId: number): Promise<UserPricingResponse> {
  const response = await fetch(`/api/pricing/user/${userId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch user pricing');
  }
  
  return response.json();
}

/**
 * Fetch all pricing profiles (admin only)
 * @returns {Promise<PricingProfile[]>} List of all pricing profiles
 */
export async function getAllPricingProfiles(): Promise<PricingProfile[]> {
  const response = await fetch('/api/admin/pricing-profiles');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch pricing profiles');
  }
  
  return response.json();
}

/**
 * Assign a pricing profile to a user (admin only)
 * @param {number} userId - The user ID to assign a profile to
 * @param {number} profileId - The profile ID to assign
 * @returns {Promise<UserPricingAssignment>} The assignment result
 */
export async function assignPricingProfile(userId: number, profileId: number): Promise<UserPricingAssignment> {
  // Using the simplified non-dynamic route endpoint
  const response = await fetch(`/api/admin/user-profile-assignment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, profileId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to assign pricing profile');
  }
  
  return response.json();
}

/**
 * Remove a pricing profile from a user (admin only)
 * @param {number} userId - The user ID to remove profile from
 * @param {number} profileId - The profile ID to remove
 * @returns {Promise<{success: boolean}>} The result of the removal operation
 */
export async function removePricingProfile(userId: number, profileId: number): Promise<{success: boolean}> {
  // Using the simplified non-dynamic route endpoint
  const response = await fetch(`/api/admin/user-profile-assignment?userId=${userId}&profileId=${profileId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove pricing profile');
  }
  
  return response.json();
}

/**
 * Calculate price based on a pricing profile and data size
 * @param {PricingProfile} profile - The pricing profile
 * @param {number} dataSizeGB - The data size in GB
 * @returns {number | null} The calculated price
 */
export function calculatePrice(profile: PricingProfile, dataSizeGB: number): number | null {
  if (!profile) return null;
  
  if (profile.isTiered && profile.tiers && profile.tiers.length > 0) {
    // Find the appropriate tier for the data size
    const applicableTier = profile.tiers
      .sort((a: PricingTier, b: PricingTier) => parseFloat(a.dataGB) - parseFloat(b.dataGB))
      .filter((tier: PricingTier) => parseFloat(tier.dataGB) <= dataSizeGB)
      .pop();
    
    if (applicableTier) {
      return parseFloat(applicableTier.price);
    } else {
      // If no applicable tier exists, calculate price as 4 times the allocation
      const fallbackPrice = dataSizeGB * 4;
      // Console log removed for security
      return parseFloat(fallbackPrice.toFixed(2));
    }
  } else {
    // Use formula-based pricing
    const basePrice = parseFloat(profile.basePrice) || 0;
    const pricePerGB = profile.dataPricePerGB ? parseFloat(profile.dataPricePerGB) : 0;
    const result = basePrice + (pricePerGB * dataSizeGB);
    return parseFloat(result.toFixed(2)); // Round to 2 decimal places
  }
}

