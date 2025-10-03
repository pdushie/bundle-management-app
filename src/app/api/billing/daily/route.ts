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
    console.error('Database connection is not available');
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
      console.error('Database error while fetching orders:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch orders from database', 
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }

    // Calculate totals
    let totalData = 0;
    let totalAmount = 0;

    console.log("Raw orders from database:", orders);
    
    console.log("Orders fetched details:", JSON.stringify(orders.map(order => ({
      id: order.id,
      cost: order.cost,
      estimatedCost: order.estimatedCost,
      status: order.status,
      totalData: order.totalData,
      typeof_cost: typeof order.cost,
      typeof_estimatedCost: typeof order.estimatedCost
    }))));

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
                console.log(`Base price for order ${order.id}: ${estimatedCost}`);
                
                // Applying tiered pricing logic
                let remainingData = totalData;
                for (const tier of tiersQuery) {
                  const tierAmount = Math.min(remainingData, parseFloat(tier.data_gb));
                  if (tierAmount <= 0) break;
                  
                  const tierCost = tierAmount * parseFloat(tier.price);
                  estimatedCost += tierCost;
                  console.log(`Added tier cost for ${tierAmount}GB: ${tierCost}`);
                  
                  remainingData -= tierAmount;
                }
              } else {
                // Simple pricing
                const basePrice = parseFloat(profile.base_price);
                const perGBRate = parseFloat(profile.data_price_per_gb || "0");
                estimatedCost = basePrice + (totalData * perGBRate);
                console.log(`Simple pricing for order ${order.id}: ${basePrice} + (${totalData} * ${perGBRate}) = ${estimatedCost}`);
              }
              
              // Apply minimum charge if applicable
              const minCharge = parseFloat(profile.minimum_charge || "0");
              if (estimatedCost < minCharge) {
                console.log(`Applied minimum charge: ${minCharge} (was ${estimatedCost})`);
                estimatedCost = minCharge;
              }
              
              // Update the order object with the calculated cost
              order.estimatedCost = estimatedCost.toFixed(2);
              console.log(`Set estimated cost for order ${order.id} to ${order.estimatedCost}`);
              
              // Also update in database for future queries
              if (neonClient) {
                await neonClient`
                  UPDATE orders 
                  SET estimated_cost = ${order.estimatedCost}, 
                      pricing_profile_name = ${profile.name}
                  WHERE id = ${order.id}
                `;
                console.log(`Updated database with estimated cost for order ${order.id}`);
              }
            }
          }
        } catch (error) {
          console.error(`Error calculating estimated cost for order ${order.id}:`, error);
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
      
      console.log(`Raw values for order ${order.id}: estimatedCost=${rawEstimatedCost} (${typeof rawEstimatedCost}), cost=${rawCost} (${typeof rawCost}), status=${order.status}`);
      
      // Try to parse the values more carefully
      let orderAmount = 0;
      if (rawEstimatedCost !== null && rawEstimatedCost !== undefined) {
        orderAmount = Number(rawEstimatedCost);
        console.log(`Using estimatedCost: ${rawEstimatedCost} -> ${orderAmount}`);
      } else if (rawCost !== null && rawCost !== undefined) {
        orderAmount = Number(rawCost);
        console.log(`Using cost: ${rawCost} -> ${orderAmount}`);
      } else {
        // If we still don't have a cost, but we know it's pending, let's use a placeholder
        if (order.status === 'pending') {
          // Use a fixed estimated cost based on data
          const tempCost = Number(order.totalData) * 1.5; // Simple placeholder calculation
          orderAmount = tempCost;
          console.log(`Using temporary estimated cost for pending order: ${tempCost}`);
        } else {
          console.log('No cost found for order');
        }
      }
      
      // Ensure we don't have NaN
      if (isNaN(orderAmount)) {
        console.log(`Order ${order.id} has NaN amount, setting to 0`);
        orderAmount = 0;
      }
      
      // ONLY ADD TO TOTAL AMOUNT IF ORDER IS PROCESSED (users only pay for processed orders)
      if (order.status === 'processed') {
        console.log(`Order ${order.id}: Adding ${orderAmount} to total (processed order)`);
        totalAmount += orderAmount;
      } else {
        console.log(`Order ${order.id}: NOT adding ${orderAmount} to total (${order.status} order)`);
      }

      // Make sure we have a definitive orderAmount to return
      if (!orderAmount && order.status === 'pending') {
        // Force a value for pending orders if we somehow don't have one
        orderAmount = Number(order.totalData) * 1.5;
        console.log(`Forcing an estimated cost for pending order ${order.id}: ${orderAmount}`);
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

    console.log(`Final calculations - totalData: ${totalData}, totalAmount: ${totalAmount}`);
    
    // Make absolutely sure totalAmount is a number
    if (isNaN(totalAmount)) {
      console.error('totalAmount is NaN, resetting to 0');
      totalAmount = 0;
    }
    
    // Debug all the individual orders
    console.log('Final order amounts:');
    formattedOrders.forEach(order => {
      console.log(`  Order ${order.id}: estimatedCost=${order.estimatedCost}`);
    });
    
    const response = {
      date: dateParam,
      totalData,
      totalAmount,
      orders: formattedOrders,
    };
    
    console.log("Final response:", JSON.stringify(response));
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching billing data:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve billing information' },
      { status: 500 }
    );
  }
}
