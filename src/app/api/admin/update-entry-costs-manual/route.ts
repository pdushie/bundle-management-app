import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pricingTiers, orders as ordersTable, orderEntries } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { calculateEntryCost } from '@/lib/entryCostCalculator';
import { getUserPricingProfile } from '@/lib/pricingUtils';
import { PricingTier } from '@/lib/pricingUtils';

// Hard-coded security token for access without authentication
const SECURITY_TOKEN = "bundle-cost-update-token-2025";

/**
 * Handler for GET and POST requests
 * This provides a manual way to update entry costs without needing authentication
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  
  // Check if token is provided and valid
  if (!token || token !== SECURITY_TOKEN) {
    console.log('Invalid security token provided:', token);
    return NextResponse.json({ 
      error: 'Invalid or missing security token',
    }, { status: 401 });
  }
  
  // Continue with the update process
  return processUpdate();
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  
  // Check if token is provided and valid
  if (!token || token !== SECURITY_TOKEN) {
    console.log('Invalid security token provided:', token);
    return NextResponse.json({ 
      error: 'Invalid or missing security token',
    }, { status: 401 });
  }
  
  // Continue with the update process
  return processUpdate();
}

/**
 * Process the update without requiring authentication
 */
async function processUpdate() {
  try {
    console.log('Starting manual update-entry-costs process');
    
    // Check if database is available
    if (!db) {
      console.error('Database connection is not available');
      return NextResponse.json({ 
        error: 'Database connection unavailable'
      }, { status: 500 });
    }
    
    // Get all orders from the database
    let orders;
    try {
      // Use direct query instead of relational query to avoid schema issues
      const ordersResult = await db.select().from(ordersTable);
      console.log(`Found ${ordersResult.length} orders to process`);
      
      // Get entries for each order
      orders = [];
      for (const order of ordersResult) {
        const entriesResult = await db.select().from(orderEntries)
          .where(eq(orderEntries.orderId, order.id));
        
        orders.push({
          ...order,
          entries: entriesResult
        });
      }
      
    } catch (dbError) {
      console.error('Database error while fetching orders:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch orders from database', 
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }

    // Process each order
    let updatedCount = 0;
    let totalEntryCount = 0;
    
    for (const order of orders) {
      try {
        console.log(`Processing order ${order.id}`);
        
        // Get the user's pricing profile
        const userId = order.userId || 0;
        console.log(`Processing order ${order.id} for user ${userId}`);
        
        const userPricingProfile = await getUserPricingProfile(userId);
        console.log(`Using pricing profile: ${userPricingProfile.name} (ID: ${userPricingProfile.id}), isTiered: ${userPricingProfile.isTiered}`);
        
        // Always use tiered pricing - force profile to be tiered
        userPricingProfile.isTiered = true;
        
        // Get pricing tiers
        let tiers: PricingTier[] = [];
        try {
          const tierResults = await db.select().from(pricingTiers)
            .where(eq(pricingTiers.profileId, userPricingProfile.id));
          
          console.log(`Found ${tierResults.length} tiers for profile ${userPricingProfile.id}`);
          
          // If no tiers found for this profile, log a warning but continue
          if (tierResults.length === 0) {
            console.warn(`No pricing tiers found for profile ${userPricingProfile.id}. Using default tiers.`);
            // Use default tiers
            tiers = [
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
          tiers = [
            { dataGB: "1", price: "5.00" },
            { dataGB: "2", price: "10.00" },
            { dataGB: "5", price: "25.00" },
            { dataGB: "10", price: "50.00" }
          ];
        }
        
        console.log(`Using pricing profile: ${userPricingProfile.name}`);
        console.log(`Found ${tiers.length} tiers for this profile`);
        
        // Process the entries for this order
        const entries = order.entries || [];
        if (entries.length === 0) {
          console.log(`No entries found for order ${order.id}`);
          continue;
        }
        
        console.log(`Found ${entries.length} entries for order ${order.id}`);
        
        // Log tier information for debugging
        tiers.forEach(tier => {
          console.log(`  - Tier ${tier.dataGB}GB: GHS ${tier.price}`);
        });
        
        let orderTotalCost = 0;
        for (const entry of entries) {
          try {
            const allocationGB = parseFloat(entry.allocationGB);
            console.log(`Processing entry ${entry.id}: ${entry.number} with allocation ${allocationGB}GB`);
            
            // Calculate cost with improved error handling
            let entryCost: number;
            try {
              entryCost = calculateEntryCost(allocationGB, userPricingProfile, tiers);
              console.log(`Calculated cost for entry ${entry.id}: GHS ${entryCost}`);
            } catch (calcError) {
              console.error(`Error calculating cost for entry ${entry.id}:`, calcError);
              // Use a fallback calculation based on the highest tier
              const highestTier = [...tiers].sort((a, b) => 
                parseFloat(b.dataGB) - parseFloat(a.dataGB)
              )[0];
              entryCost = parseFloat(highestTier.price);
              console.log(`Using fallback cost for entry ${entry.id}: GHS ${entryCost}`);
            }
            
            // Update the entry in the database with improved error handling
            try {
              await db.execute(sql`UPDATE order_entries SET cost = ${entryCost.toString()} WHERE id = ${entry.id}`);
              console.log(`Updated cost for entry ${entry.id}`);
            } catch (dbError) {
              console.error(`Error updating entry ${entry.id}:`, dbError);
              // Continue with the loop even if this update fails
              continue;
            }
            
            orderTotalCost += entryCost;
            totalEntryCount++;
          } catch (entryError) {
            console.error(`Error processing entry ${entry.id}:`, entryError);
            // Continue with the next entry
            continue;
          }
        }
        
        // Update the order total cost with improved error handling
        try {
          console.log(`Updating order ${order.id} total cost to GHS ${orderTotalCost.toFixed(2)}`);
          await db.execute(
            sql`UPDATE orders SET cost = ${orderTotalCost.toString()}, estimated_cost = ${orderTotalCost.toString()} WHERE id = ${order.id}`
          );
          console.log(`Successfully updated order ${order.id}`);
        } catch (updateError) {
          console.error(`Error updating order ${order.id} total cost:`, updateError);
          // Continue with the next order
          continue;
        }
        
        console.log(`Updated order ${order.id} total cost: GHS ${orderTotalCost.toFixed(2)}`);
        
        updatedCount++;
        
        // Log progress every 5 orders
        if (updatedCount % 5 === 0) {
          console.log(`Processed ${updatedCount} orders so far (${totalEntryCount} entries)`);
        }
      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
      }
    }
    
    console.log(`Successfully updated ${updatedCount} out of ${orders.length} orders (${totalEntryCount} entries)`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Updated ${updatedCount} orders with tier-based entry costs (${totalEntryCount} entries total)`,
      updatedCount,
      totalCount: orders.length,
      totalEntryCount
    });
  } catch (error) {
    console.error('Error updating entry costs:', error);
    return NextResponse.json({ 
      error: 'Failed to update entry costs',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
