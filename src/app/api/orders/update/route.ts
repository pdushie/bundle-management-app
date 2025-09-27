import { NextRequest, NextResponse } from 'next/server';
import { updateOrder } from '@/lib/orderDbOperations';
import { createHistoryEntryFromOrder } from '@/lib/historyDbOperations';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    
    // Update the order in the database
    await updateOrder(order);
    
    // If the order is being processed (status changed to "processed"),
    // create a history entry for it
    if (order.status === "processed") {
      try {
        // Get the current user's ID from the session
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id as string | undefined;
        
        // Create the history entry with the user ID if available
        await createHistoryEntryFromOrder(order, userId);
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
