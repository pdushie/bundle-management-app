import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pricingTiers, orders as ordersTable, orderEntries } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { calculateEntryCost } from '@/lib/entryCostCalculator';
import { getUserPricingProfile } from '@/lib/pricingUtils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PricingTier } from '@/lib/pricingUtils';

/**
 * GET handler for the update-entry-costs endpoint
 * This allows the endpoint to be accessed directly from a browser
 * as described in the UPDATE-PRICING.md documentation
 */
export async function GET(request: NextRequest) {
  // Console log removed for security
  // Simply redirect to the POST handler logic
  return await POST(request);
}

export async function POST(request: NextRequest) {
  try {
    // Console log removed for security
    
    // Check if database is available
    if (!db) {
      // Console statement removed for security
      return NextResponse.json({ 
        error: 'Database connection unavailable'
      }, { status: 500 });
    }
    
    // Check authentication - only admins can run this
    try {
      const session = await getServerSession(authOptions) as any;
      // Console log removed for security
      
      // Debug log the full session object
      // Console log removed for security
      
      // Accept any user with role 'admin', 'superadmin', or if isAdmin is true
      const isAdmin = 
        session?.user?.isAdmin === true || 
        session?.user?.role === 'admin' || 
        session?.user?.role === 'super_admin';
      
      // Console log removed for security
      
      if (!isAdmin) {
        return NextResponse.json({ 
          error: 'Unauthorized - Only admins can update entry costs',
          userRole: session?.user?.role,
          isAdminFlag: session?.user?.isAdmin
        }, { status: 401 });
      }
    } catch (authError) {
      // Console statement removed for security
      return NextResponse.json({ 
        error: 'Authentication error', 
        details: authError instanceof Error ? authError.message : String(authError)
      }, { status: 500 });
    }

    // Get all orders from the database using direct queries to avoid schema issues
    let orders;
    try {
      // Use direct query instead of relational query
      const ordersResult = await db.select().from(ordersTable);
      // Console log removed for security
      
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
      // Console statement removed for security
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
        // Console log removed for security
        
        // Get the user's pricing profile
        const userId = order.userId || 0;
        // Processing order for user - logging removed for security
        
        const userPricingProfile = await getUserPricingProfile(userId);
        if (!userPricingProfile) {
          // Console statement removed for security
          continue; // Skip this order if no pricing profile
        }
        // Console log removed for security
        
        // Always use tiered pricing - force profile to be tiered
        userPricingProfile.isTiered = true;
        
        // Get pricing tiers
        let tiers: PricingTier[] = [];
        try {
          const tierResults = await db.select().from(pricingTiers)
            .where(eq(pricingTiers.profileId, userPricingProfile.id));
          
          // Console log removed for security
          
          // If no tiers found for this profile, log a warning but continue
          if (tierResults.length === 0) {
            // Console statement removed for security
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
          // Console statement removed for security
          // Use default tiers as fallback
          tiers = [
            { dataGB: "1", price: "5.00" },
            { dataGB: "2", price: "10.00" },
            { dataGB: "5", price: "25.00" },
            { dataGB: "10", price: "50.00" }
          ];
        }
        
        // Console log removed for security
        // Console log removed for security
        
        // Process the entries for this order
        const entries = order.entries || [];
        if (entries.length === 0) {
          // Console log removed for security
          continue;
        }
        
        // Console log removed for security
        
        // Log tier information for debugging
        tiers.forEach(tier => {
          // Console log removed for security
        });
        
        let orderTotalCost = 0;
        for (const entry of entries) {
          try {
            const allocationGB = parseFloat(entry.allocationGB);
            // Processing entry with allocation - logging removed for security
            
            // Calculate cost with improved error handling
            let entryCost: number;
            try {
              entryCost = calculateEntryCost(allocationGB, userPricingProfile, tiers);
              // Console log removed for security
            } catch (calcError) {
              // Console statement removed for security
              // Use a fallback calculation based on the highest tier
              const highestTier = [...tiers].sort((a, b) => 
                parseFloat(b.dataGB) - parseFloat(a.dataGB)
              )[0];
              entryCost = parseFloat(highestTier.price);
              // Console log removed for security
            }
            
            // Update the entry in the database with improved error handling
            try {
              await db.execute(sql`UPDATE order_entries SET cost = ${entryCost.toString()} WHERE id = ${entry.id}`);
              // Console log removed for security
            } catch (dbError) {
              // Console statement removed for security
              // Continue with the loop even if this update fails
              continue;
            }
            
            orderTotalCost += entryCost;
            totalEntryCount++;
          } catch (entryError) {
            // Console statement removed for security
            // Continue with the next entry
            continue;
          }
        }
        
        // Update the order total cost with improved error handling
        try {
          // Console log removed for security
          await db.execute(
            sql`UPDATE orders SET cost = ${orderTotalCost.toString()}, estimated_cost = ${orderTotalCost.toString()} WHERE id = ${order.id}`
          );
          // Console log removed for security
        } catch (updateError) {
          // Console statement removed for security
          // Continue with the next order
          continue;
        }
        
        // Console log removed for security
        
        updatedCount++;
        
        // Log progress every 5 orders
        if (updatedCount % 5 === 0) {
          // Console log removed for security
        }
      } catch (orderError) {
        // Console statement removed for security
      }
    }
    
    // Console log removed for security
    
    return NextResponse.json({ 
      success: true, 
      message: `Updated ${updatedCount} orders with tier-based entry costs (${totalEntryCount} entries total)`,
      updatedCount,
      totalCount: orders.length,
      totalEntryCount
    });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json({ 
      error: 'Failed to update entry costs',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}


