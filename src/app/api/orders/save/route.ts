import { NextRequest, NextResponse } from 'next/server';
import { saveOrders } from '@/lib/orderDbOperations';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { orders } = data;
    
    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json(
        { error: 'Valid orders array is required' },
        { status: 400 }
      );
    }
    
    await saveOrders(orders);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { error: 'Failed to save orders' },
      { status: 500 }
    );
  }
}

