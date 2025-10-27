import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getDateBounds, getFormattedDate } from '@/lib/dateUtils';
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
    const formattedDate = getFormattedDate(date);

    // Find all orders for the user on the specified date using direct queries
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

    // Generate CSV content
    let csvContent = 'Order ID,Time,Total Entries,Total Data (GB),Pricing Profile,Amount (GHS)\n';
    
    orders.forEach(order => {
      const time = new Date(order.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
      
      csvContent += `${order.id},${time},${order.totalCount},${order.totalData},${order.pricingProfileName || 'Default'},${order.estimatedCost || 0}\n`;
    });

    // Calculate totals
    let totalData = 0;
    let totalAmount = 0;

    orders.forEach(order => {
      totalData += Number(order.totalData || 0);
      totalAmount += Number(order.estimatedCost || 0);
    });

    // Add summary row
    csvContent += `\nTotal,,${orders.length},${totalData.toFixed(2)},,${totalAmount.toFixed(2)}\n`;

    // Set headers for CSV download
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="Billing_${dateParam}.csv"`);

    return new NextResponse(csvContent, {
      status: 200,
      headers
    });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { error: 'Failed to export billing information' },
      { status: 500 }
    );
  }
}

