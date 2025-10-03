import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orderEntries } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { orderId, status } = await request.json();
    
    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Order ID and status are required' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Update all entries for the specified order to the new status
    await db
      .update(orderEntries)
      .set({ status })
      .where(eq(orderEntries.orderId, orderId));

    return NextResponse.json({ 
      success: true,
      message: `Updated all entries for order ${orderId} to status: ${status}`
    });
  } catch (error) {
    console.error('Error updating entry statuses:', error);
    return NextResponse.json(
      { error: 'Failed to update entry statuses' },
      { status: 500 }
    );
  }
}