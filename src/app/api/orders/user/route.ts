import { NextRequest, NextResponse } from 'next/server';
import { getUserOrdersOldestFirst } from '@/lib/orderDbOperations';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { userEmail } = data;
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }
    
    const userOrders = await getUserOrdersOldestFirst(userEmail);
    
    return NextResponse.json({ orders: userOrders });
  } catch (error) {
    console.error('Error in user orders route:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve user orders' },
      { status: 500 }
    );
  }
}
