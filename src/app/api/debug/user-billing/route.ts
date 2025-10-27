import { NextRequest, NextResponse } from 'next/server';
import { db, neonClient } from '@/lib/db';
import { orders as ordersTable, orderEntries, users } from '@/lib/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getDateBounds } from '@/lib/dateUtils';

// Disable authentication for this debug endpoint
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userEmail = searchParams.get('email');
  const dateParam = searchParams.get('date');

  if (!userEmail || !dateParam) {
    return NextResponse.json({ 
      error: 'email and date parameters are required' 
    }, { status: 400 });
  }

  try {
    // Parse the date
    const dateParts = dateParam.split('-');
    if (dateParts.length !== 3) {
      return NextResponse.json({ 
        error: 'Invalid date format. Use YYYY-MM-DD' 
      }, { status: 400 });
    }
    
    const [year, month, day] = dateParts.map(Number);
    const date = new Date(year, month - 1, day);
    const { start, end } = getDateBounds(date);

    // Console log removed for security
    // Console log removed for security
    // Console log removed for security

    // Get user info
    const userResult = await db!.select().from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    const user = userResult[0];
    // Console log removed for security

    // Find all orders for the user on the specified date
    const ordersResult = await db!.select().from(ordersTable)
      .where(and(
        eq(ordersTable.userEmail, userEmail),
        gte(ordersTable.timestamp, start.getTime()),
        lte(ordersTable.timestamp, end.getTime())
      ))
      .orderBy(desc(ordersTable.timestamp));

    // Console log removed for security

    // Get entries for each order and detailed info
    const ordersWithDetails = [];
    for (const order of ordersResult) {
      const entriesResult = await db!.select().from(orderEntries)
        .where(eq(orderEntries.orderId, order.id));
      
      const orderDate = new Date(order.timestamp);
      
      ordersWithDetails.push({
        ...order,
        entries: entriesResult,
        orderDate: orderDate.toISOString(),
        localOrderDate: orderDate.toLocaleString(),
        timestampDebug: {
          original: order.timestamp,
          isInRange: order.timestamp >= start.getTime() && order.timestamp <= end.getTime(),
          startTime: start.getTime(),
          endTime: end.getTime()
        }
      });

      // Console log removed for security
      // Console log removed for security
      // Console log removed for security
      // Console log removed for security
      // Console log removed for security
      // Console log removed for security
      // Console log removed for security
    }

    // Also check for any orders around that date (±1 day) to see if there are timezone issues
    const previousDay = new Date(date);
    previousDay.setDate(date.getDate() - 1);
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    const allOrdersAroundDate = await db!.select().from(ordersTable)
      .where(and(
        eq(ordersTable.userEmail, userEmail),
        gte(ordersTable.timestamp, previousDay.getTime()),
        lte(ordersTable.timestamp, nextDay.getTime())
      ))
      .orderBy(desc(ordersTable.timestamp));

    // Console log removed for security
    
    const surroundingOrders = allOrdersAroundDate.map(order => ({
      id: order.id,
      timestamp: order.timestamp,
      date: new Date(order.timestamp).toISOString(),
      localDate: new Date(order.timestamp).toLocaleString(),
      cost: order.cost,
      estimatedCost: order.estimatedCost,
      status: order.status,
      totalData: order.totalData
    }));

    // Calculate totals for the exact date
    let totalAmount = 0;
    let totalData = 0;

    ordersWithDetails.forEach(order => {
      totalData += Number(order.totalData || 0);
      
      const orderAmount = Number(order.estimatedCost || order.cost || 0);
      totalAmount += orderAmount;
    });

    return NextResponse.json({
      userEmail,
      userId: user.id,
      requestedDate: dateParam,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
        startTimestamp: start.getTime(),
        endTimestamp: end.getTime()
      },
      ordersOnDate: ordersWithDetails,
      ordersAroundDate: surroundingOrders,
      summary: {
        totalOrders: ordersWithDetails.length,
        totalAmount,
        totalData,
        ordersAroundDateCount: allOrdersAroundDate.length
      }
    });

  } catch (error) {
    // Console statement removed for security
    return NextResponse.json({
      error: 'Failed to debug billing data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

