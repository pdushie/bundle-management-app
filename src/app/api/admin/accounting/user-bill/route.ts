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
      
      // Make sure we have a proper userName by using email as fallback
      console.log('Empty orders - user data:', { 
        name: user.name ? `"${user.name}"` : 'null/undefined', 
        name_type: typeof user.name,
        email: user.email
      });
      
      // Force use the name if it exists and is not empty, otherwise use email
      let userName = user.name;
      if (!userName || userName.trim() === '') {
        userName = user.email;
        console.log('Using email as fallback for empty name in empty orders response');
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
    
    // Get user details
    console.log(`Fetching user details for ID: ${userIdInt}`);
    // Use raw SQL to directly query the database
    const userDetailsResult = await db!.execute(sql`
      SELECT id, name, email FROM users WHERE id = ${userIdInt} LIMIT 1
    `);
    
    console.log('Raw SQL result:', userDetailsResult);
    
    // Format the result into the expected array structure
    const userDetails = userDetailsResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email
    }));
    
    console.log('User details query result:', JSON.stringify(userDetails));
    
    if (userDetails.length === 0) {
      console.log(`No user found with ID: ${userIdInt}`);
      return NextResponse.json({ 
        error: 'User not found'
      }, { status: 404 });
    }
    
    const user = userDetails[0];
    console.log('User data from DB query:', { 
      id: user.id, 
      name: user.name ? `"${user.name}"` : 'null/undefined', 
      name_type: typeof user.name,
      email: user.email
    });
    
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
    
    // Make sure we have a proper userName by using email as fallback
    // Extra debugging to check name type and value
    console.log('Before userName determination:', { 
      user_name: user.name,
      name_type: typeof user.name,
      name_null: user.name === null,
      name_undefined: user.name === undefined,
      name_empty: user.name === '',
      user_email: user.email
    });
    
    // Force use the name if it exists and is not empty, otherwise use email
    let userName = user.name;
    if (!userName || userName.trim() === '') {
      userName = user.email;
      console.log('Using email as fallback for empty name');
    }
    
    console.log('Final userName determination:', { 
      original_name: user.name,
      fallback_email: user.email,
      final: userName || 'Unknown User'
    });
    
    const response = {
      userId: user.id,
      userName: userName || 'Unknown User', // Ensure userName is never null or empty
      userEmail: user.email || 'unknown@example.com',
      date: date,
      orders: formattedOrders,
      totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
      totalData
    };
    
    console.log('Sending response with userName:', response.userName);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error generating user bill:', error);
    return NextResponse.json({ 
      error: 'Failed to generate bill',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
