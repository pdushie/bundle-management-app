import { db, neonClient } from './db';
import { orders, orderEntries } from './schema';
import { eq, desc, asc, and } from 'drizzle-orm';

// Define Order type to match the one in orderStorage.ts
export type OrderEntryStatus = "pending" | "sent" | "error";

export type Order = {
  id: string;
  timestamp: number;
  date: string;
  time: string;
  userName: string;
  userEmail: string;
  totalData: number;
  totalCount: number;
  status: "pending" | "processed";
  entries: Array<{
    id?: number; // Optional ID for database entries
    number: string;
    allocationGB: number;
    status?: OrderEntryStatus;
    cost?: number | null; // Individual cost for this entry
  }>;
  isSelected?: boolean;
  // Optional fields for the pricing system
  cost?: number;
  estimatedCost?: number | null; // Total estimated cost of the order for frontend display
  pricingProfileId?: number; // ID of the pricing profile used
  pricingProfileName?: string; // Name of the pricing profile used
  userId?: number;
};

export type OrderWithoutEntries = Omit<Order, 'entries'>;

// Helper function to convert database order to application order
const mapDbOrderToOrder = async (dbOrder: any): Promise<Order> => {
  // Fetch entries for this order
  const dbEntries = db
    ? await db.select().from(orderEntries).where(eq(orderEntries.orderId, dbOrder.id))
    : await neonClient`SELECT * FROM order_entries WHERE order_id = ${dbOrder.id}`;
  
  // Map database entries to application entries
  const entries = dbEntries.map(entry => ({
    id: entry.id,
    number: entry.number,
    allocationGB: parseFloat(entry.allocationGB as string),
    status: entry.status as OrderEntryStatus,
    cost: entry.cost ? parseFloat(entry.cost as string) : null // Include individual entry cost
  }));
  
  // Return complete order with entries
  return {
    id: dbOrder.id,
    timestamp: Number(dbOrder.timestamp),
    date: dbOrder.date,
    time: dbOrder.time,
    userName: dbOrder.userName,
    userEmail: dbOrder.userEmail,
    totalData: parseFloat(dbOrder.totalData as string),
    totalCount: dbOrder.totalCount,
    status: dbOrder.status as "pending" | "processed",
    entries,
    isSelected: false, // Always initialize as not selected
    cost: dbOrder.cost ? parseFloat(dbOrder.cost as string) : null, // Include cost from database
    // Make sure estimatedCost is always set, even for pending orders
    estimatedCost: dbOrder.estimatedCost ? parseFloat(dbOrder.estimatedCost as string) : 
                  (dbOrder.cost ? parseFloat(dbOrder.cost as string) : null),
    pricingProfileId: dbOrder.pricingProfileId || undefined,
    pricingProfileName: dbOrder.pricingProfileName || undefined
  };
};

// Save a new order to the database
export const saveOrder = async (order: Order): Promise<void> => {
  try {
    // Insert the order first - no transaction
    if (db) {
      await db.insert(orders).values({
      id: order.id,
      timestamp: order.timestamp,
      date: order.date,
      time: order.time,
      userName: order.userName,
      userEmail: order.userEmail,
      totalData: order.totalData.toString(),
      totalCount: order.totalCount,
      status: order.status,
      userId: order.userId || null // Get userId from the order
    });
    
    // Insert all entries for this order in a single batch operation
    if (order.entries && order.entries.length > 0) {
      // Create an array of entry objects for batch insertion
      const entriesForBatch = order.entries.map(entry => ({
        orderId: order.id,
        number: entry.number,
        allocationGB: entry.allocationGB.toString(),
        status: entry.status || "pending"
      }));
      
      // Batch insert all entries at once
      await db.insert(orderEntries).values(entriesForBatch);
    }
    
    // Server-side operations don't directly notify client
    // Client notification happens via API responses
  } catch (error) {
    console.error('Failed to save order to database:', error);
    throw error;
  }
};

// Save a new order with cost information to the database
export const saveOrderWithCost = async (order: Order): Promise<void> => {
  try {
    // Insert the order first - no transaction
    await db.insert(orders).values({
      id: order.id,
      timestamp: order.timestamp,
      date: order.date,
      time: order.time,
      userName: order.userName,
      userEmail: order.userEmail,
      totalData: order.totalData.toString(),
      totalCount: order.totalCount,
      status: order.status,
      userId: order.userId || null, // Get userId from the order
      cost: order.cost ? order.cost.toString() : null, // Include cost if present
      estimatedCost: order.estimatedCost ? order.estimatedCost.toString() : order.cost ? order.cost.toString() : null, // Include estimatedCost
      pricingProfileId: order.pricingProfileId || null,
      pricingProfileName: order.pricingProfileName || null
    });
    
    // Insert all entries for this order in a single batch operation
    if (order.entries && order.entries.length > 0) {
      // Get entries with costs from the order directly
      // The costs should have been calculated in the API layer using the entryCostCalculator
      // If entries already have costs, use them as is
      let entriesWithCost = order.entries;
      
      // Create an array of entry objects for batch insertion
      const entriesForBatch = entriesWithCost.map(entry => ({
        orderId: order.id,
        number: entry.number,
        allocationGB: entry.allocationGB.toString(),
        status: entry.status || "pending",
        cost: entry.cost !== undefined && entry.cost !== null ? entry.cost.toString() : null
      }));
      
      // Batch insert all entries at once
      await db.insert(orderEntries).values(entriesForBatch);
    }
    
    // Server-side operations don't directly notify client
    // Client notification happens via API responses
  } catch (error) {
    console.error('Failed to save order with cost to database:', error);
    throw error;
  }
};

// Update an existing order in the database
export const updateOrder = async (order: Order): Promise<void> => {
  try {
    if (db) {
      await db.update(orders)
        .set({
          timestamp: order.timestamp,
          date: order.date,
          time: order.time,
          status: order.status,
          totalData: order.totalData.toString(),
          totalCount: order.totalCount
        })
        .where(eq(orders.id, order.id));
      await db.delete(orderEntries).where(eq(orderEntries.orderId, order.id));
      for (const entry of order.entries) {
        await db.insert(orderEntries).values({
          orderId: order.id,
          number: entry.number,
          allocationGB: entry.allocationGB.toString(),
          status: entry.status || "pending"
        });
      }
    } else {
      // Fallback for mock mode: use neonClient
      await neonClient`UPDATE orders SET timestamp = ${order.timestamp}, date = ${order.date}, time = ${order.time}, status = ${order.status}, total_data = ${order.totalData.toString()}, total_count = ${order.totalCount} WHERE id = ${order.id}`;
      await neonClient`DELETE FROM order_entries WHERE order_id = ${order.id}`;
      for (const entry of order.entries) {
        await neonClient`INSERT INTO order_entries (order_id, number, allocation_gb, status) VALUES (${order.id}, ${entry.number}, ${entry.allocationGB.toString()}, ${entry.status || "pending"})`;
      }
    }
  } catch (error) {
    console.error('Failed to update order in database:', error);
    throw error;
  }
};

// Save multiple orders to database (used for bulk operations)
export const saveOrders = async (ordersToSave: Order[]): Promise<void> => {
  try {
    const sortedOrders = [...ordersToSave].sort((a, b) => b.timestamp - a.timestamp);
    if (db) {
      await db.delete(orders);
      for (const order of sortedOrders) {
        await saveOrder(order);
      }
    } else {
      await neonClient`DELETE FROM orders`;
      for (const order of sortedOrders) {
        await saveOrder(order);
      }
    }
  } catch (error) {
    console.error('Failed to save orders to database:', error);
    throw error;
  }
};

// Load all orders from database
export const loadOrders = async (): Promise<Order[]> => {
  try {
    // Get all orders sorted by timestamp descending (newest first)
    const dbOrders = await db.select().from(orders).orderBy(desc(orders.timestamp));
    try {
      let dbOrders;
      if (db) {
        dbOrders = await db.select().from(orders).orderBy(desc(orders.timestamp));
      } else {
        dbOrders = await neonClient`SELECT * FROM orders ORDER BY timestamp DESC`;
      }
      const allOrders: Order[] = [];
      for (const dbOrder of dbOrders) {
        const order = await mapDbOrderToOrder(dbOrder);
        allOrders.push(order);
      }
      return allOrders;
    } catch (error) {
      console.error('Failed to load orders from database:', error);
      throw error;
    }
export const addOrder = async (order: Order): Promise<void> => {
  try {
    await saveOrder(order);
  } catch (error) {
    console.error('Failed to add order to database:', error);
    throw error;
  }
};

// Get orders sorted by timestamp with oldest first (for queue display)
export const getOrdersOldestFirst = async (): Promise<Order[]> => {
  try {
    // Get all orders sorted by timestamp ascending (oldest first)
    const dbOrders = await db.select().from(orders).orderBy(asc(orders.timestamp));
    
    // Map to application orders with entries
    const allOrders: Order[] = [];
    for (const dbOrder of dbOrders) {
      const order = await mapDbOrderToOrder(dbOrder);
      allOrders.push(order);
    }
    
    return allOrders;
  } catch (error) {
    console.error('Failed to get orders from database:', error);
    return [];
  }
};

// Get pending orders (not yet processed) sorted by timestamp with oldest first
export const getPendingOrdersOldestFirst = async (): Promise<Order[]> => {
  try {
    // Get pending orders sorted by timestamp ascending (oldest first)
    const dbOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.status, 'pending'))
      .orderBy(asc(orders.timestamp));
    
    // Map to application orders with entries
    const allOrders: Order[] = [];
    for (const dbOrder of dbOrders) {
      const order = await mapDbOrderToOrder(dbOrder);
      allOrders.push(order);
    }
    
    return allOrders;
  } catch (error) {
    console.error('Failed to get pending orders from database:', error);
    return [];
  }
};

// Get processed orders sorted by timestamp with oldest first
export const getProcessedOrdersOldestFirst = async (): Promise<Order[]> => {
  try {
    // Get processed orders sorted by timestamp ascending (oldest first)
    const dbOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.status, 'processed'))
      .orderBy(asc(orders.timestamp));
    
    // Map to application orders with entries
    const allOrders: Order[] = [];
    for (const dbOrder of dbOrders) {
      const order = await mapDbOrderToOrder(dbOrder);
      allOrders.push(order);
    }
    
    return allOrders;
  } catch (error) {
    console.error('Failed to get processed orders from database:', error);
    return [];
  }
};

// Get orders by user email sorted by timestamp with oldest first
export const getUserOrdersOldestFirst = async (userEmail: string): Promise<Order[]> => {
  try {
    if (!userEmail) return [];
    
    // Get user orders sorted by timestamp ascending (oldest first)
    const dbOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userEmail, userEmail))
      .orderBy(asc(orders.timestamp));
    
    // Map to application orders with entries
    const allOrders: Order[] = [];
    for (const dbOrder of dbOrders) {
      const order = await mapDbOrderToOrder(dbOrder);
      allOrders.push(order);
    }
    
    return allOrders;
  } catch (error) {
    console.error('Failed to get user orders from database:', error);
    return [];
  }
};

// Clear all orders from database
export const clearOrders = async (): Promise<void> => {
  try {
    await db.delete(orders);
    // Server-side operations don't directly notify client
    // Client notification happens via API responses
  } catch (error) {
    console.error('Failed to clear orders from database:', error);
    throw error;
  }
};

// Get order counts for various categories - FIXED VERSION with direct SQL
export const getOrderCounts = async (userEmail?: string): Promise<{
  pendingCount: number;
  processedCount: number;
  userOrderCount: number;
  connectionError?: boolean;
}> => {
  const defaultCounts = {
    pendingCount: 0,
    processedCount: 0,
    userOrderCount: 0
  };
  
  try {
    // First, test the database connection directly
    try {
      // Use the neonClient directly with the correct tagged template syntax
      const testQuery = await neonClient`SELECT 1 AS test`;
      console.log('Database connection test passed:', testQuery);
    } catch (connError) {
      console.error('Database connection test failed in getOrderCounts:', connError);
      // Create error with connection error details
      const connectionError = new Error('Database connection failed');
      (connectionError as any).cause = connError;
      // Return default counts with connection error flag instead of throwing
      return { ...defaultCounts, connectionError: true };
    }

    // DIRECT SQL APPROACH - Bypass Drizzle ORM for greater reliability
    // This avoids potential quoting issues with ORM
    
    // Get pending orders count with direct SQL
    console.log('Getting pending orders count with direct SQL');
    const pendingResult = await neonClient`SELECT COUNT(*) FROM orders WHERE status = 'pending'`;
    const pendingCount = parseInt(pendingResult[0]?.count || '0', 10);
    console.log('Pending orders count:', pendingCount);
    
    // Get processed orders count with direct SQL
    console.log('Getting processed orders count with direct SQL');
    const processedResult = await neonClient`SELECT COUNT(*) FROM orders WHERE status = 'processed'`;
    const processedCount = parseInt(processedResult[0]?.count || '0', 10);
    console.log('Processed orders count:', processedCount);
    
    // Count user orders if userEmail is provided with direct SQL
    let userOrderCount = 0;
    if (userEmail) {
      console.log('Getting user orders count with direct SQL for:', userEmail);
      const userResult = await neonClient`SELECT COUNT(*) FROM orders WHERE user_email = ${userEmail}`;
      userOrderCount = parseInt(userResult[0]?.count || '0', 10);
      console.log('User orders count:', userOrderCount);
    }
    
    // Return all counts
    const counts = {
      pendingCount,
      processedCount,
      userOrderCount
    };
    
    console.log('Final order counts:', counts);
    return counts;
  } catch (error) {
    console.error('Failed to get order counts from database:', error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Check for nested errors
      if ('cause' in error) {
        console.error('Caused by:', error.cause);
      }
    }
    
    // Return default counts with connection error flag
    return { ...defaultCounts, connectionError: true };
  }
};
