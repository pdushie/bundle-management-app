import { PricingProfile, PricingTier, getUserPricingProfile } from './pricingUtils';
import { calculateEntryCost, calculateEntryCosts } from './entryCostCalculator';
import { db } from './db';
import { pricingTiers } from './schema';
import { eq } from 'drizzle-orm';

export interface OrderEntry {
  id?: number;
  number: string;
  allocationGB: number;
  status?: string;
  cost?: number | null;
}

export interface Order {
  id: string;
  timestamp: number;
  date: string;
  time: string;
  userName: string;
  userEmail: string;
  totalData: number;
  totalCount: number;
  status: "pending" | "processed";
  entries: OrderEntry[];
  isSelected?: boolean;
  cost?: number | null;
  estimatedCost?: number | null;
  pricingProfileId?: number;
  pricingProfileName?: string;
  userId?: number | null;
}

/**
 * Ensures that an order has accurate costs calculated for each entry and for the total order
 * This function can be called from any route or function that creates or updates orders
 * 
 * @param order The order to calculate costs for
 * @param userId The user ID associated with the order
 * @returns A new order object with calculated costs
 */
export async function ensureOrderCosts(order: Order, userId?: number | null): Promise<Order> {
  try {
    console.log(`Ensuring costs for order ${order.id} (userId: ${userId || 'none'})`);
    
    // Check if database is available
    if (!db) {
      console.error('Database connection is not available');
      // Return original order if database is not available
      return order;
    }
    
    // Use order's userId as a fallback if not provided
    const effectiveUserId = userId || order.userId || 0;
    
    // Get the user's pricing profile
    const userPricingProfile = await getUserPricingProfile(effectiveUserId);
    console.log(`Using pricing profile: ${userPricingProfile.name} (ID: ${userPricingProfile.id})`);
    
    // Always ensure we're using tiered pricing
    userPricingProfile.isTiered = true;
    
    // Get pricing tiers for the profile
    let tiers: PricingTier[] = [];
    try {
      const tierResults = await db.select().from(pricingTiers)
        .where(eq(pricingTiers.profileId, userPricingProfile.id));
      
      console.log(`Found ${tierResults.length} tiers for profile ${userPricingProfile.id}`);
      
      // If no tiers found for this profile, log a warning but continue with default tiers
      if (tierResults.length === 0) {
        console.warn(`No pricing tiers found for profile ${userPricingProfile.id}. Using default tiers.`);
        // Use default tiers
        tiers = userPricingProfile.tiers || [
          { dataGB: "1", price: "5.00" },
          { dataGB: "2", price: "10.00" },
          { dataGB: "5", price: "25.00" },
          { dataGB: "10", price: "50.00" }
        ];
      } else {
        tiers = tierResults.map(tier => ({
          id: tier.id,
          profileId: tier.profileId,
          dataGB: tier.dataGB,
          price: tier.price
        }));
      }
    } catch (tierError) {
      console.error(`Error fetching tiers for profile ${userPricingProfile.id}:`, tierError);
      // Use default tiers as fallback
      tiers = userPricingProfile.tiers || [
        { dataGB: "1", price: "5.00" },
        { dataGB: "2", price: "10.00" },
        { dataGB: "5", price: "25.00" },
        { dataGB: "10", price: "50.00" }
      ];
    }
    
    // Calculate costs for each entry
    const entriesWithCosts = order.entries.map(entry => {
      try {
        const cost = calculateEntryCost(entry.allocationGB, userPricingProfile, tiers);
        return {
          ...entry,
          cost: cost
        };
      } catch (calcError) {
        console.error(`Error calculating cost for entry ${entry.number}:`, calcError);
        // Use a fallback calculation based on the highest tier
        const highestTier = [...tiers].sort((a, b) => 
          parseFloat(b.dataGB) - parseFloat(a.dataGB)
        )[0];
        const fallbackCost = parseFloat(highestTier.price);
        console.log(`Using fallback cost for entry ${entry.number}: GHS ${fallbackCost}`);
        return {
          ...entry,
          cost: fallbackCost
        };
      }
    });
    
    // Calculate total order cost as the sum of all entry costs
    const orderTotalCost = entriesWithCosts.reduce(
      (total, entry) => total + (entry.cost || 0), 
      0
    );
    
    // Apply minimum charge if needed
    const minCharge = parseFloat(userPricingProfile.minimumCharge || "0");
    const finalCost = Math.max(orderTotalCost, minCharge);
    
    // Round to 2 decimal places
    const roundedCost = Math.round(finalCost * 100) / 100;
    
    console.log(`Calculated total cost for order ${order.id}: GHS ${roundedCost}`);
    
    // Return a new order object with the calculated costs
    return {
      ...order,
      entries: entriesWithCosts,
      cost: roundedCost,
      estimatedCost: roundedCost,
      pricingProfileId: userPricingProfile.id,
      pricingProfileName: userPricingProfile.name
    };
  } catch (error) {
    console.error('Error ensuring order costs:', error);
    // Return original order if an error occurs
    return order;
  }
}
