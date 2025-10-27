import { NextRequest, NextResponse } from 'next/server';
import { clearOrders } from '@/lib/orderDbOperations';

export async function POST() {
  try {
    await clearOrders();
    return NextResponse.json({ success: true });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { error: 'Failed to clear orders' },
      { status: 500 }
    );
  }
}

