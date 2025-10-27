import { NextRequest, NextResponse } from 'next/server';
import { 
  loadOrders, 
  getOrdersOldestFirst,
  getPendingOrdersOldestFirst,
  getProcessedOrdersOldestFirst
} from '@/lib/orderDbOperations';

export async function GET() {
  try {
    // Get all orders
    const orders = await loadOrders();
    return NextResponse.json({ orders });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { error: 'Failed to retrieve orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { type } = data;
    
    let results;
    
    switch (type) {
      case 'all':
        results = await loadOrders();
        break;
      case 'all-oldest-first':
        results = await getOrdersOldestFirst();
        break;
      case 'pending':
        results = await getPendingOrdersOldestFirst();
        break;
      case 'processed':
        results = await getProcessedOrdersOldestFirst();
        break;
      default:
        results = await loadOrders();
    }
    
    return NextResponse.json({ orders: results });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { error: 'Failed to retrieve orders' },
      { status: 500 }
    );
  }
}

