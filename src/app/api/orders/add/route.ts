import { NextRequest, NextResponse } from 'next/server';
import { saveOrderWithCost, Order as DbOrder } from '@/lib/orderDbOperations';
import { notifyAdminAboutNewOrder } from '@/lib/adminNotifications';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureOrderCosts } from '@/lib/costCalculationMiddleware';
import { getUserPricingProfile } from '@/lib/pricingUtils';
import { validateOrderPricing } from '@/lib/entryCostCalculator';
import { db } from '@/lib/db';
import { pricingTiers } from '@/lib/schema';
import { eq } from 'drizzle-orm';

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
    
    // Validate that the user has a pricing profile assigned
    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }
    
    // Check if user has an assigned pricing profile (not default)
    const userPricingProfile = await getUserPricingProfile(userId, false);
    if (!userPricingProfile) {
      return NextResponse.json(
        { 
          error: 'No pricing profile assigned',
          message: 'You must have a pricing profile assigned by an administrator before placing orders.'
        },
        { status: 403 }
      );
    }
    
    // Get pricing tiers for the user's profile
    if (!db) {
      return NextResponse.json(
        { 
          error: 'Database connection error',
          message: 'Unable to validate pricing. Please try again later.'
        },
        { status: 500 }
      );
    }
    
    const tiers = await db.select().from(pricingTiers)
      .where(eq(pricingTiers.profileId, userPricingProfile.id));
    
    // Validate that all order entries have pricing available
    const pricingValidation = validateOrderPricing(order.entries, tiers);
    if (!pricingValidation.isValid) {
      const invalidItems = pricingValidation.invalidEntries
        .map(entry => `${entry.number} (${entry.allocationGB}GB): ${entry.reason}`)
        .join('; ');
      
      return NextResponse.json(
        { 
          error: 'Invalid order entries',
          message: `Some entries have no pricing available in your profile: ${invalidItems}`,
          invalidEntries: pricingValidation.invalidEntries
        },
        { status: 400 }
      );
    }
    
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
