import { db, neonClient } from './db';
import { orders, orderEntries, users } from './schema';
import { eq, desc, asc, and, gte, lte } from 'drizzle-orm';

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
  processedBy?: number;
  processedAt?: string;
  createdAt?: string;
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
    processedBy: dbOrder.processedBy || undefined,
    processedAt: dbOrder.processedAt || undefined,
    createdAt: dbOrder.createdAt || undefined,
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
    // Console statement removed for security
    throw error;
  }
};

export const loadOrders = async (): Promise<Order[]> => {
  try {
    let dbOrders;
    if (db) {
      dbOrders = await db
        .select({
          id: orders.id,
          timestamp: orders.timestamp,
          date: orders.date,
          time: orders.time,
          userName: orders.userName,
          userEmail: orders.userEmail,
          totalData: orders.totalData,
          totalCount: orders.totalCount,
          status: orders.status,
          userId: orders.userId,
          cost: orders.cost,
          estimatedCost: orders.estimatedCost,
          pricingProfileId: orders.pricingProfileId,
          pricingProfileName: orders.pricingProfileName,
          processedBy: orders.processedBy,
          processedAt: orders.processedAt,
          createdAt: orders.createdAt
        })
        .from(orders)
        .orderBy(desc(orders.timestamp));
    } else {
      dbOrders = await neonClient`SELECT * FROM orders ORDER BY timestamp DESC`;
    }
    const allOrders: Order[] = [];
    for (const dbOrder of dbOrders) {
      // Fetch the entries for this order
      let entries;
      if (db) {
        entries = await db
          .select()
          .from(orderEntries)
          .where(eq(orderEntries.orderId, dbOrder.id));
      } else {
        entries = await neonClient`SELECT * FROM order_entries WHERE order_id = ${dbOrder.id}`;
      }
      
      // Attach entries to the order object
      const orderWithEntries = {
        ...dbOrder,
        entries: entries
      };
      
      const order = await mapDbOrderToOrder(orderWithEntries);
      allOrders.push(order);
    }
    return allOrders;
  } catch (error) {
    // Console statement removed for security
    throw error;
  }
};

export const addOrder = async (order: Order): Promise<void> => {
  try {
    await saveOrder(order);
  } catch (error) {
    // Console statement removed for security
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
    // Console statement removed for security
    throw error;
  }
};

// Get all orders sorted by timestamp ascending (oldest first)
export const getOrdersOldestFirst = async (): Promise<Order[]> => {
  try {
    let dbOrders;
    if (db) {
      dbOrders = await db
        .select({
          id: orders.id,
          timestamp: orders.timestamp,
          date: orders.date,
          time: orders.time,
          userName: orders.userName,
          userEmail: orders.userEmail,
          totalData: orders.totalData,
          totalCount: orders.totalCount,
          status: orders.status,
          userId: orders.userId,
          cost: orders.cost,
          estimatedCost: orders.estimatedCost,
          pricingProfileId: orders.pricingProfileId,
          pricingProfileName: orders.pricingProfileName,
          processedBy: orders.processedBy,
          processedAt: orders.processedAt,
          createdAt: orders.createdAt
        })
        .from(orders)
        .orderBy(asc(orders.timestamp));
    } else {
      dbOrders = await neonClient`SELECT * FROM orders ORDER BY timestamp ASC`;
    }
    const allOrders: Order[] = [];
    for (const dbOrder of dbOrders) {
      // Fetch the entries for this order
      let entries;
      if (db) {
        entries = await db
          .select()
          .from(orderEntries)
          .where(eq(orderEntries.orderId, dbOrder.id));
      } else {
        entries = await neonClient`SELECT * FROM order_entries WHERE order_id = ${dbOrder.id}`;
      }
      
      // Attach entries to the order object
      const orderWithEntries = {
        ...dbOrder,
        entries: entries
      };
      
      const order = await mapDbOrderToOrder(orderWithEntries);
      allOrders.push(order);
    }
    return allOrders;
  } catch (error) {
    // Console statement removed for security
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
    // Console statement removed for security
    throw error;
  }
};

// Update an order by id - FIXED VERSION
export const updateOrder = async (orderId: string, updates: Partial<Order>): Promise<void> => {
  try {
    if (db) {
      // Filter out read-only fields that shouldn't be updated in the database
      const { entries, isSelected, createdAt, ...updatesToApply } = updates;
      
      // Convert number fields to strings for Drizzle
      const drizzleUpdates: any = { ...updatesToApply };
      if (drizzleUpdates.totalData !== undefined) drizzleUpdates.totalData = drizzleUpdates.totalData.toString();
      if (drizzleUpdates.cost !== undefined) drizzleUpdates.cost = drizzleUpdates.cost !== null ? drizzleUpdates.cost.toString() : null;
      if (drizzleUpdates.estimatedCost !== undefined) drizzleUpdates.estimatedCost = drizzleUpdates.estimatedCost !== null ? drizzleUpdates.estimatedCost.toString() : null;
      
      // Handle processedAt conversion
      if (drizzleUpdates.processedAt !== undefined) {
        if (typeof drizzleUpdates.processedAt === 'string') {
          drizzleUpdates.processedAt = new Date(drizzleUpdates.processedAt);
        } else if (!(drizzleUpdates.processedAt instanceof Date)) {
          // Try to convert other types to Date
          drizzleUpdates.processedAt = new Date(drizzleUpdates.processedAt);
        }
      }
      
      await db.update(orders).set(drizzleUpdates).where(eq(orders.id, orderId));
    } else {
      // Only allow updating one field at a time for Neon
      const allowedFields = [
        'timestamp', 'date', 'time', 'userName', 'userEmail', 'totalData', 'totalCount', 'status',
        'cost', 'estimatedCost', 'pricingProfileId', 'pricingProfileName', 'userId', 'processedBy', 'processedAt'
      ];
      let updated = false;
      for (const key of allowedFields) {
        if (updates[key as keyof Order] !== undefined) {
          let v = updates[key as keyof Order];
          if (v === null) v = null;
          else if (typeof v === 'number') v = v.toString();
          else if (typeof v === 'boolean') v = v ? 'true' : 'false';
          // Handle processedAt conversion for Neon
          else if (key === 'processedAt' && typeof v === 'string') {
            v = new Date(v).toISOString();
          }
          await neonClient`UPDATE orders SET ${key} = ${v} WHERE id = ${orderId}`;
          updated = true;
        }
      }
      if (!updated) return; // Nothing to update
    }
  } catch (error) {
    // Console statement removed for security
    throw error;
  }
};

// Get pending orders (not yet processed) sorted by timestamp with oldest first
export const getPendingOrdersOldestFirst = async (): Promise<Order[]> => {
  try {
    // Get pending orders sorted by timestamp ascending (oldest first)
    if (!db) throw new Error('Database not initialized');
    const dbOrders = await db
      .select({
        id: orders.id,
        timestamp: orders.timestamp,
        date: orders.date,
        time: orders.time,
        userName: orders.userName,
        userEmail: orders.userEmail,
        totalData: orders.totalData,
        totalCount: orders.totalCount,
        status: orders.status,
        userId: orders.userId,
        cost: orders.cost,
        estimatedCost: orders.estimatedCost,
        pricingProfileId: orders.pricingProfileId,
        pricingProfileName: orders.pricingProfileName,
        processedBy: orders.processedBy,
        processedAt: orders.processedAt,
        createdAt: orders.createdAt
      })
      .from(orders)
      .where(eq(orders.status, 'pending'))
      .orderBy(asc(orders.timestamp));
    
    // Map to application orders with entries
    const allOrders: Order[] = [];
    for (const dbOrder of dbOrders) {
      // Fetch the entries for this order
      const entries = await db
        .select()
        .from(orderEntries)
        .where(eq(orderEntries.orderId, dbOrder.id));
      
      // Attach entries to the order object
      const orderWithEntries = {
        ...dbOrder,
        entries: entries
      };
      
      const order = await mapDbOrderToOrder(orderWithEntries);
      allOrders.push(order);
    }
    
    return allOrders;
  } catch (error) {
    // Console statement removed for security
    return [];
  }
};

// Get processed orders sorted by timestamp with oldest first
export const getProcessedOrdersOldestFirst = async (): Promise<Order[]> => {
  try {
    // Get processed orders sorted by timestamp ascending (oldest first)
    if (!db) throw new Error('Database not initialized');
    const dbOrders = await db
      .select({
        id: orders.id,
        timestamp: orders.timestamp,
        date: orders.date,
        time: orders.time,
        userName: orders.userName,
        userEmail: orders.userEmail,
        totalData: orders.totalData,
        totalCount: orders.totalCount,
        status: orders.status,
        userId: orders.userId,
        cost: orders.cost,
        estimatedCost: orders.estimatedCost,
        pricingProfileId: orders.pricingProfileId,
        pricingProfileName: orders.pricingProfileName,
        processedBy: orders.processedBy,
        processedAt: orders.processedAt,
        createdAt: orders.createdAt
      })
      .from(orders)
      .where(eq(orders.status, 'processed'))
      .orderBy(asc(orders.timestamp));
    
    // Map to application orders with entries
    const allOrders: Order[] = [];
    for (const dbOrder of dbOrders) {
      // Fetch the entries for this order
      const entries = await db
        .select()
        .from(orderEntries)
        .where(eq(orderEntries.orderId, dbOrder.id));
      
      // Attach entries to the order object
      const orderWithEntries = {
        ...dbOrder,
        entries: entries
      };
      
      const order = await mapDbOrderToOrder(orderWithEntries);
      allOrders.push(order);
    }
    
    return allOrders;
  } catch (error) {
    // Console statement removed for security
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
      .select({
        id: orders.id,
        timestamp: orders.timestamp,
        date: orders.date,
        time: orders.time,
        userName: orders.userName,
        userEmail: orders.userEmail,
        totalData: orders.totalData,
        totalCount: orders.totalCount,
        status: orders.status,
        userId: orders.userId,
        cost: orders.cost,
        estimatedCost: orders.estimatedCost,
        pricingProfileId: orders.pricingProfileId,
        pricingProfileName: orders.pricingProfileName,
        processedBy: orders.processedBy,
        processedAt: orders.processedAt,
        createdAt: orders.createdAt
      })
      .from(orders)
      .where(eq(orders.userEmail, userEmail))
      .orderBy(asc(orders.timestamp));
    
    // Map to application orders with entries
    const allOrders: Order[] = [];
    for (const dbOrder of dbOrders) {
      // Fetch the entries for this order
      const entries = await db
        .select()
        .from(orderEntries)
        .where(eq(orderEntries.orderId, dbOrder.id));
      
      // Attach entries to the order object
      const orderWithEntries = {
        ...dbOrder,
        entries: entries
      };
      
      // Map the order with its entries to our application model
      const order = await mapDbOrderToOrder(orderWithEntries);
      allOrders.push(order);
    }
    
    return allOrders;
  } catch (error) {
    // Console statement removed for security
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
    // Console statement removed for security
    throw error;
  }
};

// Get order counts for various categories - FIXED VERSION with direct SQL
// Now filters by current date for tab notifications
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
      // Console log removed for security
    } catch (connError) {
      // Console statement removed for security
      // Create error with connection error details
      const connectionError = new Error('Database connection failed');
      (connectionError as any).cause = connError;
      // Return default counts with connection error flag instead of throwing
      return { ...defaultCounts, connectionError: true };
    }

    // Get current date in YYYY-MM-DD format for filtering
    const today = new Date().toISOString().split('T')[0];
    
    // DIRECT SQL APPROACH - Bypass Drizzle ORM for greater reliability
    // This avoids potential quoting issues with ORM
    // NOW FILTERING BY CURRENT DATE ONLY
    
    // Get pending orders count for today only
    // Getting pending orders count for today with direct SQL - logging removed for security
    const pendingResult = await neonClient`SELECT COUNT(*) FROM orders WHERE status = 'pending' AND date = ${today}`;
    const pendingCount = parseInt(pendingResult[0]?.count || '0', 10);
    // Pending orders count for today - logging removed for security
    
    // Get processed orders count for today only
    // Getting processed orders count for today with direct SQL - logging removed for security
    const processedResult = await neonClient`SELECT COUNT(*) FROM orders WHERE status = 'processed' AND date = ${today}`;
    const processedCount = parseInt(processedResult[0]?.count || '0', 10);
    // Processed orders count for today - logging removed for security
    
    // Count user orders for today if userEmail is provided with direct SQL
    let userOrderCount = 0;
    if (userEmail) {
      // Getting user orders count for today with direct SQL - logging removed for security
      const userResult = await neonClient`SELECT COUNT(*) FROM orders WHERE user_email = ${userEmail} AND date = ${today}`;
      userOrderCount = parseInt(userResult[0]?.count || '0', 10);
      // User orders count for today - logging removed for security
    }
    
    // Return all counts (now filtered by current date)
    const counts = {
      pendingCount,
      processedCount,
      userOrderCount
    };
    
    // Final order counts for today - logging removed for security
    return counts;
  } catch (error) {
    // Console statement removed for security
    
    // Log detailed error information
    if (error instanceof Error) {
      // Console statement removed for security
      // Console statement removed for security
      // Console statement removed for security
      
      // Check for nested errors
      if ('cause' in error) {
        // Console statement removed for security
      }
    }
    
    // Return default counts with connection error flag
    return { ...defaultCounts, connectionError: true };
  }
};

// Get all-time order counts (not filtered by date) - for admin/reporting purposes
export const getAllTimeOrderCounts = async (userEmail?: string): Promise<{
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
      const testQuery = await neonClient`SELECT 1 AS test`;
    } catch (connError) {
      const connectionError = new Error('Database connection failed');
      (connectionError as any).cause = connError;
      return { ...defaultCounts, connectionError: true };
    }

    // Get all-time pending orders count
    const pendingResult = await neonClient`SELECT COUNT(*) FROM orders WHERE status = 'pending'`;
    const pendingCount = parseInt(pendingResult[0]?.count || '0', 10);
    
    // Get all-time processed orders count
    const processedResult = await neonClient`SELECT COUNT(*) FROM orders WHERE status = 'processed'`;
    const processedCount = parseInt(processedResult[0]?.count || '0', 10);
    
    // Count all-time user orders if userEmail is provided
    let userOrderCount = 0;
    if (userEmail) {
      const userResult = await neonClient`SELECT COUNT(*) FROM orders WHERE user_email = ${userEmail}`;
      userOrderCount = parseInt(userResult[0]?.count || '0', 10);
    }
    
    return {
      pendingCount,
      processedCount,
      userOrderCount
    };
  } catch (error) {
    return { ...defaultCounts, connectionError: true };
  }
};

// Get orders with admin information for reporting - includes joins to get admin details
export const getOrdersWithAdminInfo = async (filters?: {
  adminId?: string;
  adminEmail?: string;
  userEmail?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Order[]> => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    // Build where conditions
    const conditions = [];
    if (filters?.adminId) {
      conditions.push(eq(orders.processedBy, parseInt(filters.adminId)));
    }
    if (filters?.adminEmail) {
      conditions.push(eq(users.email, filters.adminEmail));
    }
    if (filters?.userEmail) {
      conditions.push(eq(orders.userEmail, filters.userEmail));
    }
    if (filters?.status) {
      conditions.push(eq(orders.status, filters.status));
    }
    if (filters?.dateFrom) {
      conditions.push(gte(orders.date, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(orders.date, filters.dateTo));
    }

    // Build the query
    let baseQuery = db
      .select({
        // Order fields
        id: orders.id,
        timestamp: orders.timestamp,
        date: orders.date,
        time: orders.time,
        userName: orders.userName,
        userEmail: orders.userEmail,
        totalData: orders.totalData,
        totalCount: orders.totalCount,
        status: orders.status,
        cost: orders.cost,
        estimatedCost: orders.estimatedCost,
        pricingProfileId: orders.pricingProfileId,
        pricingProfileName: orders.pricingProfileName,
        userId: orders.userId,
        processedBy: orders.processedBy,
        processedAt: orders.processedAt,
        // Admin info
        adminEmail: users.email,
        adminName: users.name
      })
      .from(orders)
      .leftJoin(users, eq(orders.processedBy, users.id))
      .orderBy(desc(orders.timestamp));

    // Apply conditions if any
    const dbOrders = conditions.length > 0 
      ? await baseQuery.where(and(...conditions))
      : await baseQuery;
    
    // Map to application orders with entries and admin info
    const allOrders: Order[] = [];
    for (const dbOrder of dbOrders) {
      // Fetch the entries for this order
      const entries = await db
        .select()
        .from(orderEntries)
        .where(eq(orderEntries.orderId, dbOrder.id));
      
      // Create order object with admin info
      const orderWithEntries = {
        id: dbOrder.id,
        timestamp: dbOrder.timestamp,
        date: dbOrder.date,
        time: dbOrder.time,
        userName: dbOrder.userName,
        userEmail: dbOrder.userEmail,
        totalData: dbOrder.totalData,
        totalCount: dbOrder.totalCount,
        status: dbOrder.status,
        cost: dbOrder.cost,
        estimatedCost: dbOrder.estimatedCost,
        pricingProfileId: dbOrder.pricingProfileId,
        pricingProfileName: dbOrder.pricingProfileName,
        userId: dbOrder.userId,
        processedBy: dbOrder.processedBy,
        processedAt: dbOrder.processedAt,
        entries: entries,
        // Additional admin info for reporting
        adminEmail: dbOrder.adminEmail,
        adminName: dbOrder.adminName
      };

      const order = await mapDbOrderToOrder(orderWithEntries);
      // Add admin info to the order for reporting
      (order as any).adminEmail = dbOrder.adminEmail;
      (order as any).adminName = dbOrder.adminName;
      
      allOrders.push(order);
    }
    
    return allOrders;
  } catch (error) {
    // Console statement removed for security
    throw error;
  }
};


