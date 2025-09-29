import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getDateBounds } from '@/lib/dateUtils';

export async function GET(request: NextRequest) {
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
    // Parse the date and get the start/end of day
    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const { start, end } = getDateBounds(date);

    // Find all orders for the user on the specified date
    const orders = await db.query.orders.findMany({
      where: (orders, { eq, and, gte, lte }) => 
        and(
          eq(orders.userEmail, session.user.email as string),
          gte(orders.timestamp, start.getTime()),
          lte(orders.timestamp, end.getTime())
        ),
      orderBy: (orders, { desc }) => [desc(orders.timestamp)],
      with: {
        entries: true,
      },
    });

    // Calculate totals
    let totalData = 0;
    let totalAmount = 0;

    const formattedOrders = orders.map(order => {
      // Add to total data
      totalData += Number(order.totalData || 0);
      
      // Add to total amount
      const orderAmount = Number(order.estimatedCost || 0);
      totalAmount += orderAmount;

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
        pricingProfileName: order.pricingProfileName || undefined,
        estimatedCost: Number(order.estimatedCost || 0),
      };
    });

    return NextResponse.json({
      date: dateParam,
      totalData,
      totalAmount,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error('Error fetching billing data:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve billing information' },
      { status: 500 }
    );
  }
}
