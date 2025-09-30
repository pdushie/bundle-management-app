import { NextRequest, NextResponse } from 'next/server';
import { saveOrderWithCost, Order as DbOrder } from '@/lib/orderDbOperations';
import { notifyAdminAboutNewOrder } from '@/lib/adminNotifications';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureOrderCosts } from '@/lib/costCalculationMiddleware';

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
    
    // Get the current session to get the user ID
    const session = await getServerSession(authOptions) as any;
    const userId = session?.user?.id ? parseInt(session.user.id) : null;
    
    console.log(`Processing new order from user ID ${userId || 'unknown'}`);
    
    // Ensure the order has accurate tier-based pricing for all entries
    const orderWithCost = await ensureOrderCosts(order, userId);
    
    // Cast the order to the database order type to satisfy TypeScript
    const typedOrderWithCost = orderWithCost as unknown as DbOrder;
    
    // Add the order to the database
    await saveOrderWithCost(typedOrderWithCost);
    
    // Send notification to admin users
    try {
      await notifyAdminAboutNewOrder(typedOrderWithCost);
    } catch (notificationError) {
      // Log but don't fail the request if notification sending fails
      console.error('Failed to send admin notification:', notificationError);
    }
    
    return NextResponse.json({ 
      success: true, 
      cost: typedOrderWithCost.cost 
    });
  } catch (error) {
    console.error('Error in add order route:', error);
    return NextResponse.json(
      { error: 'Failed to add order' },
      { status: 500 }
    );
  }
}
