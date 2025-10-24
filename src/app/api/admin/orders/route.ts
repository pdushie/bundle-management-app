import { NextRequest, NextResponse } from 'next/server';
import { getOrdersWithAdminInfo } from '@/lib/orderDbOperations';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const filters: any = {};
    
    if (searchParams.get('adminId')) {
      filters.adminId = searchParams.get('adminId');
    }
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status');
    } else {
      // Default to processed orders only
      filters.status = 'processed';
    }
    if (searchParams.get('dateFrom')) {
      filters.dateFrom = searchParams.get('dateFrom');
    }
    if (searchParams.get('dateTo')) {
      filters.dateTo = searchParams.get('dateTo');
    }

    // Get orders with admin information
    const orders = await getOrdersWithAdminInfo(filters);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { filters, export: shouldExport } = body;

    // Get orders with admin information
    const orders = await getOrdersWithAdminInfo(filters);

    if (shouldExport) {
      // Return CSV format for export
      const csvHeaders = [
        'Order ID',
        'Date',
        'Time',
        'User Name',
        'User Email',
        'Status',
        'Total Data',
        'Total Count',
        'Cost',
        'Admin Email',
        'Admin Name',
        'Processed At'
      ].join(',');

      const csvRows = orders.map(order => [
        order.id,
        order.date,
        order.time,
        order.userName,
        order.userEmail,
        order.status,
        order.totalData,
        order.totalCount,
        order.cost || '',
        (order as any).adminEmail || '',
        (order as any).adminName || '',
        order.processedAt || ''
      ].map(field => `"${field}"`).join(','));

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="admin-orders-report.csv"'
        }
      });
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error processing admin orders request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}