import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders as ordersTable } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';

// Helper function to check if user has admin role
function isAdminUser(session: any) {
  if (!session || !session.user) return false;
  
  // Check for admin roles including standard_admin
  return session.user.role === 'admin' || 
         session.user.role === 'super_admin' || 
         session.user.role === 'standard_admin' ||
         session.user.isAdmin === true;
}

export async function GET(request: NextRequest) {
  try {
    // Check if database is available
    if (!db) {
      // Console statement removed for security
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

    // Get user details first to get their email for filtering orders
    // Console log removed for security
    const userDetailsResult = await db!.execute(sql`
      SELECT id, name, email FROM users WHERE id = ${userIdInt} LIMIT 1
    `);
    
    const userDetails = userDetailsResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email
    }));
    
    if (userDetails.length === 0) {
      // Console log removed for security
      return NextResponse.json({ 
        error: 'User not found'
      }, { status: 404 });
    }
    
    const user = userDetails[0];
    const userEmail = user.email;
    
    // Console log removed for security

    // Parse date as UTC and get UNIX timestamps
    const startTimestamp = new Date(date + 'T00:00:00.000Z').getTime();
    const endTimestamp = new Date(date + 'T23:59:59.999Z').getTime();

    // Query to get all orders for the specified user and date
    // Note: Using userEmail instead of userId because user_id field is not populated in orders table
    const userOrders = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          sql`timestamp >= ${startTimestamp} AND timestamp <= ${endTimestamp}`,
          eq(ordersTable.date, date),
          eq(ordersTable.userEmail, userEmail)
        )
      )
      .orderBy(ordersTable.timestamp);
      
    // Console log removed for security
    
    // If no orders found, return empty UserBillData structure
    if (userOrders.length === 0) {
      // Use the user details we already fetched above
      let userName = user.name;
      if (!userName || userName.trim() === '') {
        userName = user.email;
        // Console log removed for security
      }
      
      return NextResponse.json({ 
        userId: user.id,
        userName: userName || 'Unknown User',
        userEmail: user.email || 'unknown@example.com',
        date: date,
        orders: [],
        totalAmount: 0,
        totalData: 0
      });
    }
    
    // User details already fetched above
    
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
    
    // Console log removed for security
    
    // Make sure we have a proper userName by using email as fallback
    // Extra debugging to check name type and value
    // Console log removed for security
    
    // Force use the name if it exists and is not empty, otherwise use email
    let userName = user.name;
    if (!userName || userName.trim() === '') {
      userName = user.email;
      // Console log removed for security
    }
    
    // Console log removed for security
    
    const response = {
      userId: user.id,
      userName: userName || 'Unknown User', // Ensure userName is never null or empty
      userEmail: user.email || 'unknown@example.com',
      date: date,
      orders: formattedOrders,
      totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
      totalData
    };
    
    // Console log removed for security
    
    return NextResponse.json(response);
    
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json({ 
      error: 'Failed to generate bill',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}


