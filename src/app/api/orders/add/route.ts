import { NextRequest, NextResponse } from 'next/server';
import { saveOrderWithCost } from '@/lib/orderDbOperations';
import { notifyAdminAboutNewOrder } from '@/lib/adminNotifications';
import { calculateOrderCost, getUserPricingProfile } from '@/lib/pricingUtils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    
    // Get the user's pricing profile and calculate the cost
    const userPricingProfile = await getUserPricingProfile(userId || 0);
    const cost = await calculateOrderCost(userId || 0, order.totalData);
    
    // Add the cost and pricing profile info to the order
    const orderWithCost = {
      ...order,
      cost,
      estimatedCost: cost, // Add estimatedCost for frontend display
      pricingProfileId: userPricingProfile.id,
      pricingProfileName: userPricingProfile.name,
      userId
    };
    
    // Add the order to the database
    await saveOrderWithCost(orderWithCost);
    
    // Send notification to admin users
    try {
      await notifyAdminAboutNewOrder(orderWithCost);
    } catch (notificationError) {
      // Log but don't fail the request if notification sending fails
      console.error('Failed to send admin notification:', notificationError);
    }
    
    return NextResponse.json({ success: true, cost });
  } catch (error) {
    console.error('Error in add order route:', error);
    return NextResponse.json(
      { error: 'Failed to add order' },
      { status: 500 }
    );
  }
}
