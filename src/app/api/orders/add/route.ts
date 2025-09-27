import { NextRequest, NextResponse } from 'next/server';
import { addOrder, saveOrder } from '@/lib/orderDbOperations';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { order } = data;
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order data is required' },
        { status: 400 }
      );
    }
    
    await addOrder(order);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in add order route:', error);
    return NextResponse.json(
      { error: 'Failed to add order' },
      { status: 500 }
    );
  }
}
