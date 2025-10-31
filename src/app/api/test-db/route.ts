import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/schema';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check if db is initialized
    if (!db) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database not initialized. Check DATABASE_URL configuration.' 
      }, { status: 500 });
    }

    // Test basic database connectivity by fetching a few orders
    const testOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        createdAt: orders.createdAt
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(3);

    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      sampleOrders: testOrders.length
    });
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}