import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders as ordersTable } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';

// Helper function to check if user has admin role
function isAdminUser(session: any) {
  if (!session || !session.user) return false;
  
  // Check for both role property and isAdmin flag for backward compatibility
  return session.user.role === 'admin' || 
         session.user.role === 'superadmin' || 
         session.user.isAdmin === true;
}

export async function GET(request: NextRequest) {
  try {
    // Check if database is available
    if (!db) {
      console.error('Database connection is not available');
      return NextResponse.json({ 
        error: 'Database connection unavailable'
      }, { status: 500 });
    }

    // Get session to check if user is admin
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdminUser(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const date = searchParams.get('date'); // Format: YYYY-MM-DD

    if (!userId || !date) {
      return NextResponse.json({ 
        error: 'Missing required parameters: userId and date'
      }, { status: 400 });
    }

    // Parse userId to integer for database query
    const userIdInt = parseInt(userId);

    if (isNaN(userIdInt)) {
      return NextResponse.json({ 
        error: 'Invalid userId: must be a number'
      }, { status: 400 });
    }

    // Parse date as UTC and get UNIX timestamps
    const startTimestamp = new Date(date + 'T00:00:00.000Z').getTime();
    const endTimestamp = new Date(date + 'T23:59:59.999Z').getTime();

    // Query to get all orders for the specified user and date
    const userOrders = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          sql`timestamp >= ${startTimestamp} AND timestamp <= ${endTimestamp}`,
          eq(ordersTable.date, date)
        )
      )
      .orderBy(ordersTable.timestamp);
      
    console.log(`Found ${userOrders.length} orders for user ${userId} on ${date}`);
    
    // If no orders found, return empty UserBillData structure
    if (userOrders.length === 0) {
      // Get user details for empty response
      const userDetails = await db!
        .select()
        .from(sql`users`)
        .where(sql`id = ${userIdInt}`)
        .limit(1) as Array<{ id: number; name: string; email: string }>;
      
      if (userDetails.length === 0) {
        return NextResponse.json({ 
          error: 'User not found'
        }, { status: 404 });
      }
      
      const user = userDetails[0];
      
      return NextResponse.json({ 
        userId: user.id,
        userName: user.name || user.email || 'Unknown User',
        userEmail: user.email || 'unknown@example.com',
        date: date,
        orders: [],
        totalAmount: 0,
        totalData: 0
      });
    }
    
    // Get user details
    const userDetails = await db!
      .select()
      .from(sql`users`)
      .where(sql`id = ${userIdInt}`)
      .limit(1) as Array<{ id: number; name: string; email: string }>;
    
    if (userDetails.length === 0) {
      return NextResponse.json({ 
        error: 'User not found'
      }, { status: 404 });
    }
    
    const user = userDetails[0];
    
    // Format the orders for the response
    const formattedOrders = await Promise.all(userOrders.map(async order => {
      // Get order entries to calculate total data
      const entries = await db!
        .select()
        .from(sql`order_entries`)
        .where(sql`order_id = ${order.id}`) as Array<{ id: number; number: number; allocationGB: string; cost?: string | null }>;
      
      // Calculate costs
      const orderCost = order.cost ? parseFloat(order.cost) : null;
      const estimatedCost = order.estimatedCost ? parseFloat(order.estimatedCost) : null;
      
      return {
        id: order.id,
        date: order.date,
        time: order.time,
        timestamp: Number(order.timestamp),
        totalCount: order.totalCount,
        totalData: parseFloat(order.totalData),
        status: order.status,
        cost: orderCost,
        estimatedCost: estimatedCost,
        entries: entries.map(entry => ({
          id: entry.id,
          number: entry.number,
          allocationGB: parseFloat(entry.allocationGB),
          cost: entry.cost ? parseFloat(entry.cost) : null
        }))
      };
    }));
    
    // Calculate totals
    const totalData = formattedOrders.reduce(
      (sum, order) => sum + order.totalData, 
      0
    );
    
    const totalAmount = formattedOrders.reduce(
      (sum, order) => sum + (order.cost || order.estimatedCost || 0), 
      0
    );
    
    console.log(`Total amount: ${totalAmount}, Total data: ${totalData}`);
    
    return NextResponse.json({
      userId: user.id,
      userName: user.name || user.email || 'Unknown User',
      userEmail: user.email || 'unknown@example.com',
      date: date,
      orders: formattedOrders,
      totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
      totalData
    });
    
  } catch (error) {
    console.error('Error generating user bill:', error);
    return NextResponse.json({ 
      error: 'Failed to generate bill',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
