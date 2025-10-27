import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, neonClient } from '@/lib/db';
import { getDateBounds } from '@/lib/dateUtils';
import { orders as ordersTable, orderEntries } from '@/lib/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  // Check if database is available
  if (!db) {
    // Console statement removed for security
    return NextResponse.json({ 
      error: 'Database connection unavailable'
    }, { status: 500 });
  }

  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get date parameter
  const url = new URL(request.url);
  const dateParam = url.searchParams.get('date');

  if (!dateParam) {
    return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
  }

  try {
    // Parse the date string as local time to avoid timezone shift
    // dateParam format should be "YYYY-MM-DD"
    const dateParts = dateParam.split('-');
    if (dateParts.length !== 3) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }
    
    const [year, month, day] = dateParts.map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const { start, end } = getDateBounds(date);

    // Find all orders for the user on the specified date using direct query instead of relational
    let orders;
    try {
      // Use direct queries to avoid relational query issues
      const ordersResult = await db.select().from(ordersTable)
        .where(and(
          eq(ordersTable.userEmail, session.user.email as string),
          gte(ordersTable.timestamp, start.getTime()),
          lte(ordersTable.timestamp, end.getTime())
        ))
        .orderBy(desc(ordersTable.timestamp));

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

    // Calculate totals
    let totalData = 0;
    let totalAmount = 0;

    // Console log removed for security
    
    // Console log removed for security

    // Calculate estimated cost for any pending orders if needed
    for (const order of orders) {
      if (order.status === 'pending' && !order.estimatedCost && !order.cost) {
        // Get user's pricing profile from direct DB query
        try {
          if (order.userId && neonClient) {
            const userProfileQuery = await neonClient`
              SELECT pp.* FROM user_pricing_profiles upp
              JOIN pricing_profiles pp ON upp.profile_id = pp.id
              WHERE upp.user_id = ${order.userId}
              LIMIT 1
            `;
            
            if (userProfileQuery.length > 0) {
              const profile = userProfileQuery[0];
              const totalData = parseFloat(order.totalData);
              let estimatedCost = 0;
              
              if (profile.is_tiered) {
                // Get pricing tiers
                const tiersQuery = await neonClient`
                  SELECT * FROM pricing_tiers 
                  WHERE profile_id = ${profile.id}
                  ORDER BY data_gb ASC
                `;
                
                // Calculate based on tiered pricing
                estimatedCost = parseFloat(profile.base_price);
                // Console log removed for security
                
                // Applying tiered pricing logic
                let remainingData = totalData;
                for (const tier of tiersQuery) {
                  const tierAmount = Math.min(remainingData, parseFloat(tier.data_gb));
                  if (tierAmount <= 0) break;
                  
                  const tierCost = tierAmount * parseFloat(tier.price);
                  estimatedCost += tierCost;
                  // Console log removed for security
                  
                  remainingData -= tierAmount;
                }
              } else {
                // Simple pricing
                const basePrice = parseFloat(profile.base_price);
                const perGBRate = parseFloat(profile.data_price_per_gb || "0");
                estimatedCost = basePrice + (totalData * perGBRate);
                // Console log removed for security
              }
              
              // Apply minimum charge if applicable
              const minCharge = parseFloat(profile.minimum_charge || "0");
              if (estimatedCost < minCharge) {
                // Console log removed for security
                estimatedCost = minCharge;
              }
              
              // Update the order object with the calculated cost
              order.estimatedCost = estimatedCost.toFixed(2);
              // Console log removed for security
              
              // Also update in database for future queries
              if (neonClient) {
                await neonClient`
                  UPDATE orders 
                  SET estimated_cost = ${order.estimatedCost}, 
                      pricing_profile_name = ${profile.name}
                  WHERE id = ${order.id}
                `;
                // Console log removed for security
              }
            }
          }
        } catch (error) {
          // Console statement removed for security
        }
      }
    }
    
    const formattedOrders = orders.map(order => {
      // Add to total data
      const orderDataAmount = Number(order.totalData || 0);
      totalData += orderDataAmount;
      
      // Calculate order amount - prefer estimatedCost over cost for consistency
      const rawEstimatedCost = order.estimatedCost;
      const rawCost = order.cost;
      
      // Console log removed for security
      
      // Try to parse the values more carefully
      let orderAmount = 0;
      if (rawEstimatedCost !== null && rawEstimatedCost !== undefined) {
        orderAmount = Number(rawEstimatedCost);
        // Console log removed for security
      } else if (rawCost !== null && rawCost !== undefined) {
        orderAmount = Number(rawCost);
        // Console log removed for security
      } else {
        // If we still don't have a cost, but we know it's pending, let's use a placeholder
        if (order.status === 'pending') {
          // Use a fixed estimated cost based on data
          const tempCost = Number(order.totalData) * 1.5; // Simple placeholder calculation
          orderAmount = tempCost;
          // Console log removed for security
        } else {
          // Console log removed for security
        }
      }
      
      // Ensure we don't have NaN
      if (isNaN(orderAmount)) {
        // Console log removed for security
        orderAmount = 0;
      }
      
      // ONLY ADD TO TOTAL AMOUNT IF ORDER IS PROCESSED (users only pay for processed orders)
      if (order.status === 'processed') {
        // Console log removed for security
        totalAmount += orderAmount;
      } else {
        // Console log removed for security
      }

      // Make sure we have a definitive orderAmount to return
      if (!orderAmount && order.status === 'pending') {
        // Force a value for pending orders if we somehow don't have one
        orderAmount = Number(order.totalData) * 1.5;
        // Console log removed for security
      }

      // Format for response
      return {
        id: order.id,
        time: new Date(order.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        }),
        totalCount: order.totalCount,
        totalData: Number(order.totalData),
        status: order.status, // Include the status
        pricingProfileName: order.pricingProfileName || undefined,
        estimatedCost: orderAmount, // Use our calculated orderAmount which includes all fallbacks
        entries: order.entries || [], // Include the order entries
      };
    });

    // Console log removed for security
    
    // Make absolutely sure totalAmount is a number
    if (isNaN(totalAmount)) {
      // Console statement removed for security
      totalAmount = 0;
    }
    
    // Debug all the individual orders
    // Console log removed for security
    formattedOrders.forEach(order => {
      // Console log removed for security
    });
    
    const response = {
      date: dateParam,
      totalData,
      totalAmount,
      orders: formattedOrders,
    };
    
    // Console log removed for security
    return NextResponse.json(response);
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { error: 'Failed to retrieve billing information' },
      { status: 500 }
    );
  }
}


