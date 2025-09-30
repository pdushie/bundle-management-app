/**
 * Migration to update all existing orders with correct tier-based pricing
 */

import { db } from '../src/lib/db';
import { orders, orderEntries } from '../src/lib/schema';
import { eq } from 'drizzle-orm';
import { ensureOrderCosts, Order } from '../src/lib/costCalculationMiddleware';

// Get all orders from the database
async function getAllOrders() {
  try {
    // Define the Order type to match the structure from the database
    interface DbOrderEntry {
      id: number;
      orderId: string;
      number: string;
      allocationGB: string;
      status: string;
      cost: string | null;
    }

    interface DbOrder {
      id: string;
      timestamp: string;
      date: string;
      time: string;
      userName: string;
      userEmail: string;
      totalData: string;
      totalCount: number;
      status: string;
      userId: number | null;
      cost: string | null;
      estimatedCost: string | null;
      pricingProfileId: number | null;
      pricingProfileName: string | null;
    }

    // Get all orders
    const dbOrders = await db.select().from(orders);
    console.log(`Found ${dbOrders.length} orders to update`);

    // Get entries for each order
    const allOrders = [];
    for (const dbOrder of dbOrders) {
      const dbEntries = await db.select().from(orderEntries).where(eq(orderEntries.orderId, dbOrder.id));

      // Map database entries to application entries
      const entries = dbEntries.map(entry => ({
        id: entry.id,
        number: entry.number,
        allocationGB: parseFloat(entry.allocationGB),
        status: entry.status,
        cost: entry.cost ? parseFloat(entry.cost) : null
      }));

      // Create the complete order object
      const order: Order = {
        id: dbOrder.id,
        timestamp: Number(dbOrder.timestamp),
        date: dbOrder.date,
        time: dbOrder.time,
        userName: dbOrder.userName,
        userEmail: dbOrder.userEmail,
        totalData: parseFloat(dbOrder.totalData),
        totalCount: dbOrder.totalCount,
        status: dbOrder.status as "pending" | "processed",
        entries: entries.map(entry => ({
          ...entry,
          status: entry.status || undefined
        })),
        isSelected: false,
        cost: dbOrder.cost ? parseFloat(dbOrder.cost) : null,
        estimatedCost: dbOrder.estimatedCost ? parseFloat(dbOrder.estimatedCost) : null,
        pricingProfileId: dbOrder.pricingProfileId || undefined,
        pricingProfileName: dbOrder.pricingProfileName || undefined,
        userId: dbOrder.userId
      };

      allOrders.push(order);
    }

    return allOrders;
  } catch (error) {
    console.error('Failed to get orders from database:', error);
    throw error;
  }
}

// Update an order in the database with costs
async function updateOrderWithCosts(order: any) {
  try {
    // Update the order with cost information
    await db.update(orders)
      .set({
        cost: order.cost ? order.cost.toString() : null,
        estimatedCost: order.estimatedCost ? order.estimatedCost.toString() : null,
        pricingProfileId: order.pricingProfileId || null,
        pricingProfileName: order.pricingProfileName || null
      })
      .where(eq(orders.id, order.id));

    // Update entry costs
    for (const entry of order.entries) {
      await db.update(orderEntries)
        .set({
          cost: entry.cost ? entry.cost.toString() : null
        })
        .where(eq(orderEntries.id, entry.id));
    }

    console.log(`Successfully updated order ${order.id} with total cost: GHS ${order.cost}`);
  } catch (error) {
    console.error(`Error updating order ${order.id}:`, error);
    throw error;
  }
}

// Main migration function
async function migrateOrderCosts() {
  try {
    console.log('Starting order cost migration...');
    
    // Get all orders
    const allOrders = await getAllOrders();
    console.log(`Found ${allOrders.length} orders to update costs for`);
    
    // Update costs for each order
    let successCount = 0;
    let errorCount = 0;
    
    for (const order of allOrders) {
      try {
        console.log(`Processing order ${order.id} for user ${order.userId || 'unknown'}`);
        
        // Calculate costs for the order
        const orderWithCosts = await ensureOrderCosts(order, order.userId || undefined);
        
        // Update the order in the database
        await updateOrderWithCosts(orderWithCosts);
        
        successCount++;
      } catch (orderError) {
        console.error(`Failed to update order ${order.id}:`, orderError);
        errorCount++;
      }
    }
    
    console.log(`Migration complete. Successfully updated ${successCount} orders. Failed: ${errorCount}`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateOrderCosts()
  .then(() => {
    console.log('Order cost migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
