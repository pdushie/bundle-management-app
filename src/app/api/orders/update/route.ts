import { NextRequest, NextResponse } from 'next/server';
import { updateOrder, Order as DbOrder } from '@/lib/orderDbOperations';
import { createHistoryEntryFromOrder } from '@/lib/historyDbOperations';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureOrderCosts } from '@/lib/costCalculationMiddleware';

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { order } = data;
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order data is required' },
        { status: 400 }
      );
    }
    
    // Get the current user's ID from the session
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id ? parseInt((session?.user as any)?.id) : null;
    
    // Ensure the order has accurate tier-based pricing for all entries
    console.log(`Updating order ${order.id} with accurate tier pricing calculations`);
    const orderWithCost = await ensureOrderCosts(order, userId);
    
    // Cast to the database order type
    const typedOrderWithCost = orderWithCost as unknown as DbOrder;
    
    // Update the order with calculated costs in the database
    await updateOrder(typedOrderWithCost);
    
    // If the order is being processed (status changed to "processed"),
    // create a history entry for it
    if (typedOrderWithCost.status === "processed") {
      try {
        // We already have the userId from above, use it for creating history
        const historyUserId = (session?.user as any)?.id as string | undefined;
        
        // Create the history entry with the user ID if available and with accurate costs
        await createHistoryEntryFromOrder(typedOrderWithCost, historyUserId);
      } catch (historyError) {
        console.error('Error creating history entry:', historyError);
        return NextResponse.json(
          { error: 'Failed to create history entry', details: historyError instanceof Error ? historyError.message : String(historyError) },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in update order route:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
