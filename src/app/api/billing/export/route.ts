import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getDateBounds, getFormattedDate } from '@/lib/dateUtils';

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
    const formattedDate = getFormattedDate(date);

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
    console.error('Error exporting billing data:', error);
    return NextResponse.json(
      { error: 'Failed to export billing information' },
      { status: 500 }
    );
  }
}
