import { db, neonClient } from './db';
import { orders, orderEntries } from './schema';
import { eq, desc, asc, and } from 'drizzle-orm';

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
    id?: number;
    number: string;
    allocationGB: number;
    status?: OrderEntryStatus;
    cost?: number | null;
  }>;
  isSelected?: boolean;
  cost?: number;
  estimatedCost?: number | null;
  pricingProfileId?: number;
  pricingProfileName?: string;
  userId?: number;
};

export type OrderWithoutEntries = Omit<Order, 'entries'>;

const mapDbOrderToOrder = async (dbOrder: any): Promise<Order> => {
  // Map database entries to application entries
  const entries = dbOrder.entries ? dbOrder.entries.map((entry: any) => ({
    id: entry.id,
    number: entry.number,
    allocationGB: parseFloat(entry.allocationGB as string),
    status: entry.status as OrderEntryStatus,
    cost: entry.cost ? parseFloat(entry.cost as string) : null
  })) : [];
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
    isSelected: false,
    cost: dbOrder.cost !== undefined && dbOrder.cost !== null ? parseFloat(dbOrder.cost as string) : undefined,
    estimatedCost: dbOrder.estimatedCost ? parseFloat(dbOrder.estimatedCost as string) : (dbOrder.cost ? parseFloat(dbOrder.cost as string) : null),
    pricingProfileId: dbOrder.pricingProfileId || undefined,
    pricingProfileName: dbOrder.pricingProfileName || undefined,
    userId: dbOrder.userId || undefined
  };
};

export const saveOrder = async (order: Order): Promise<void> => {
  try {
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
        userId: order.userId || null
      });
      if (order.entries && order.entries.length > 0) {
        const entriesForBatch = order.entries.map(entry => ({
          orderId: order.id,
          number: entry.number,
          allocationGB: entry.allocationGB.toString(),
          status: entry.status || "pending"
        }));
        await db.insert(orderEntries).values(entriesForBatch);
      }
    } else {
      await neonClient`INSERT INTO orders (id, timestamp, date, time, user_name, user_email, total_data, total_count, status, user_id) VALUES (${order.id}, ${order.timestamp}, ${order.date}, ${order.time}, ${order.userName}, ${order.userEmail}, ${order.totalData.toString()}, ${order.totalCount}, ${order.status}, ${order.userId || null})`;
      if (order.entries && order.entries.length > 0) {
        for (const entry of order.entries) {
          await neonClient`INSERT INTO order_entries (order_id, number, allocation_gb, status) VALUES (${order.id}, ${entry.number}, ${entry.allocationGB.toString()}, ${entry.status || "pending"})`;
        }
      }
    }
  } catch (error) {
    console.error('Failed to save order to database:', error);
    throw error;
  }
};

export const loadOrders = async (): Promise<Order[]> => {
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
};

export const addOrder = async (order: Order): Promise<void> => {
  try {
    await saveOrder(order);
  } catch (error) {
    console.error('Failed to add order to database:', error);
    throw error;
  }
};

// Save a single order with cost
export const saveOrderWithCost = async (order: Order): Promise<void> => {
  try {
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
        cost: order.cost !== undefined && order.cost !== null ? order.cost.toString() : null,
        estimatedCost: order.estimatedCost !== undefined && order.estimatedCost !== null ? order.estimatedCost.toString() : null,
        pricingProfileId: order.pricingProfileId !== undefined ? order.pricingProfileId : null,
        pricingProfileName: order.pricingProfileName !== undefined ? order.pricingProfileName : null,
        userId: order.userId ?? null
      });
      if (order.entries && order.entries.length > 0) {
        const entriesForBatch = order.entries.map(entry => ({
          orderId: order.id,
          number: entry.number,
          allocationGB: entry.allocationGB.toString(),
          status: entry.status || "pending",
          cost: entry.cost !== undefined && entry.cost !== null ? entry.cost.toString() : null
        }));
        await db.insert(orderEntries).values(entriesForBatch);
      }
    } else {
      await neonClient`INSERT INTO orders (id, timestamp, date, time, user_name, user_email, total_data, total_count, status, cost, estimated_cost, pricing_profile_id, pricing_profile_name, user_id) VALUES (${order.id}, ${order.timestamp}, ${order.date}, ${order.time}, ${order.userName}, ${order.userEmail}, ${order.totalData.toString()}, ${order.totalCount}, ${order.status}, ${order.cost ?? null}, ${order.estimatedCost ?? null}, ${order.pricingProfileId ?? null}, ${order.pricingProfileName ?? null}, ${order.userId ?? null})`;
      if (order.entries && order.entries.length > 0) {
        for (const entry of order.entries) {
          await neonClient`INSERT INTO order_entries (order_id, number, allocation_gb, status, cost) VALUES (${order.id}, ${entry.number}, ${entry.allocationGB.toString()}, ${entry.status || "pending"}, ${entry.cost ?? null})`;
        }
      }
    }
  } catch (error) {
    console.error('Failed to save order with cost:', error);
    throw error;
  }
};

// Get all orders sorted by timestamp ascending (oldest first)
export const getOrdersOldestFirst = async (): Promise<Order[]> => {
  try {
    let dbOrders;
    if (db) {
      dbOrders = await db.select().from(orders).orderBy(asc(orders.timestamp));
    } else {
      dbOrders = await neonClient`SELECT * FROM orders ORDER BY timestamp ASC`;
    }
    const allOrders: Order[] = [];
    for (const dbOrder of dbOrders) {
      const order = await mapDbOrderToOrder(dbOrder);
      allOrders.push(order);
    }
    return allOrders;
  } catch (error) {
    console.error('Failed to get orders oldest first:', error);
    throw error;
  }
};

// Save multiple orders
export const saveOrders = async (ordersList: Order[]): Promise<void> => {
  try {
    for (const order of ordersList) {
      await saveOrder(order);
    }
  } catch (error) {
    console.error('Failed to save multiple orders:', error);
    throw error;
  }
};

// Update an order by id - FIXED VERSION
export const updateOrder = async (orderId: string, updates: Partial<Order>): Promise<void> => {
  try {
    if (db) {
      // Convert number fields to strings for Drizzle
      const drizzleUpdates: any = { ...updates };
      if (drizzleUpdates.totalData !== undefined) drizzleUpdates.totalData = drizzleUpdates.totalData.toString();
      if (drizzleUpdates.cost !== undefined) drizzleUpdates.cost = drizzleUpdates.cost !== null ? drizzleUpdates.cost.toString() : null;
      if (drizzleUpdates.estimatedCost !== undefined) drizzleUpdates.estimatedCost = drizzleUpdates.estimatedCost !== null ? drizzleUpdates.estimatedCost.toString() : null;
      await db.update(orders).set(drizzleUpdates).where(eq(orders.id, orderId));
    } else {
      // Build the SET clause and values for the tagged template
      const keys = Object.keys(updates);
      const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
      const values = Object.values(updates).map(v => {
        if (v === null || v === undefined) return '';
        if (typeof v === 'number') return v.toString();
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        return v;
      });
      // Use a tagged template for Neon
      await neonClient([
        `UPDATE orders SET ${setClauses} WHERE id = $${values.length + 1}`,
        ...values,
        orderId
      ]);
    }
  } catch (error) {
    console.error('Failed to update order:', error);
    throw error;
  }
};

// Get pending orders (not yet processed) sorted by timestamp with oldest first
export const getPendingOrdersOldestFirst = async (): Promise<Order[]> => {
  try {
    // Get pending orders sorted by timestamp ascending (oldest first)
    if (!db) throw new Error('Database not initialized');
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
    if (!db) throw new Error('Database not initialized');
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
    if (!db) throw new Error('Database not initialized');
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
    if (!db) throw new Error('Database not initialized');
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
