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
    
    // IMPORTANT: Preserve costs when processing orders
    // If the order is being processed and already has costs, don't zero them out
    if (typedOrderWithCost.status === "processed" && 
        (order.cost !== undefined || order.estimatedCost !== undefined)) {
      console.log(`Order ${order.id} being processed - preserving existing costs`);
      console.log(`Original cost: ${order.cost}, estimatedCost: ${order.estimatedCost}`);
      console.log(`Calculated cost: ${typedOrderWithCost.cost}, estimatedCost: ${typedOrderWithCost.estimatedCost}`);
      
      // Use the calculated cost if the original cost is 0 or null, otherwise preserve original
      if (!order.cost || parseFloat(order.cost.toString()) === 0) {
        console.log(`Using calculated cost since original is 0 or null`);
      } else {
        console.log(`Preserving original cost since it's not zero`);
        typedOrderWithCost.cost = order.cost;
        typedOrderWithCost.estimatedCost = order.estimatedCost || order.cost;
      }
    }
    
    // Update the order with calculated costs in the database
    await updateOrder(typedOrderWithCost.id, typedOrderWithCost);
    
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
