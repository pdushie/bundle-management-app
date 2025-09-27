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
  }>;
  isSelected?: boolean;
};

export type OrderWithoutEntries = Omit<Order, 'entries'>;

// Helper function to convert database order to application order
const mapDbOrderToOrder = async (dbOrder: any): Promise<Order> => {
  // Fetch entries for this order
  const dbEntries = await db.select().from(orderEntries).where(eq(orderEntries.orderId, dbOrder.id));
  
  // Map database entries to application entries
  const entries = dbEntries.map(entry => ({
    id: entry.id,
    number: entry.number,
    allocationGB: parseFloat(entry.allocationGB as string),
    status: entry.status as OrderEntryStatus
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
    isSelected: false // Always initialize as not selected
  };
};

// Save a new order to the database
export const saveOrder = async (order: Order): Promise<void> => {
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
      userId: null // This could be populated from session if needed
    });
    
    // Insert all entries for this order
    if (order.entries && order.entries.length > 0) {
      for (const entry of order.entries) {
        await db.insert(orderEntries).values({
          orderId: order.id,
          number: entry.number,
          allocationGB: entry.allocationGB.toString(),
          status: entry.status || "pending"
        });
      }
    }
    
    // Server-side operations don't directly notify client
    // Client notification happens via API responses
  } catch (error) {
    console.error('Failed to save order to database:', error);
    throw error;
  }
};

// Update an existing order in the database
export const updateOrder = async (order: Order): Promise<void> => {
  try {
    // Update the order - no transaction
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
    
    // Handle entries updates - this is more complex
    // For simplicity, we'll delete all entries and re-insert them
    // In a real app, you might want to update existing entries instead
    await db.delete(orderEntries).where(eq(orderEntries.orderId, order.id));
    
    // Re-insert all entries
    for (const entry of order.entries) {
      await db.insert(orderEntries).values({
        orderId: order.id,
        number: entry.number,
        allocationGB: entry.allocationGB.toString(),
        status: entry.status || "pending"
      });
    }
    
    // Server-side operations don't directly notify client
    // Client notification happens via API responses
  } catch (error) {
    console.error('Failed to update order in database:', error);
    throw error;
  }
};

// Save multiple orders to database (used for bulk operations)
export const saveOrders = async (ordersToSave: Order[]): Promise<void> => {
  try {
    // Sort orders by timestamp descending (newest first) before saving
    const sortedOrders = [...ordersToSave].sort((a, b) => b.timestamp - a.timestamp);
    
    // We'll delete all existing orders and their entries
    // This will cascade delete the entries due to foreign key constraints
    // In a real app, you might want to be more selective
    await db.delete(orders);
    
    // Insert all orders one by one
    for (const order of sortedOrders) {
      await saveOrder(order);
    }
    
    // Server-side operations don't directly notify client
    // Client notification happens via API responses
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
    
    // Map to application orders with entries
    const allOrders: Order[] = [];
    for (const dbOrder of dbOrders) {
      const order = await mapDbOrderToOrder(dbOrder);
      allOrders.push(order);
    }
    
    return allOrders;
  } catch (error) {
    console.error('Failed to load orders from database:', error);
    return [];
  }
};

// Add a new order to the database
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
      .where(eq(orders.status, "pending"))
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
      .where(eq(orders.status, "processed"))
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

// Get order counts for various categories
export const getOrderCounts = async (userEmail?: string): Promise<{
  pendingCount: number;
  processedCount: number;
  userOrderCount: number;
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
      throw connectionError;
    }

    // Use a more resilient approach with retries and better error handling
    const maxRetries = 3;
    let retryCount = 0;
    let pendingCount = 0;
    let processedCount = 0;
    let userOrderCount = 0;
    let lastError: any;
    
    // Define executeWithRetry as a const function expression instead of a function declaration
    const executeWithRetry = async <T>(queryFn: () => Promise<T>, errorContext: string): Promise<T | null> => {
      for (let i = 0; i <= maxRetries; i++) {
        try {
          // Add small delay on retries with exponential backoff
          if (i > 0) {
            const backoffDelay = Math.min(Math.pow(2, i) * 500, 5000); // Max 5 second delay
            console.log(`Retrying ${errorContext} after ${backoffDelay}ms delay...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
          
          return await queryFn();
        } catch (error) {
          console.error(`${errorContext} (attempt ${i + 1}/${maxRetries + 1}):`, error);
          
          // Check specifically for ECONNRESET errors which may require longer delays
          const isConnReset = error instanceof Error && 
            (error.message.includes('ECONNRESET') || 
             (error as any).cause && String((error as any).cause).includes('ECONNRESET'));
             
          if (isConnReset) {
            console.log('Detected ECONNRESET error, will wait longer before retry');
            // Add additional delay for connection reset errors
            await new Promise(resolve => setTimeout(resolve, 2000)); 
          }
          
          lastError = error;
          
          // If we've reached max retries, return null
          if (i === maxRetries) {
            return null;
          }
        }
      }
      return null;
    };
    
    // Get pending orders count - using count for better reliability
    const pendingResult = await executeWithRetry(
      () => db.select({ count: orders.id })
           .from(orders)
           .where(eq(orders.status, "pending")),
      "Failed to count pending orders"
    );
    
    if (pendingResult && pendingResult[0]) {
      pendingCount = Number(pendingResult[0].count) || 0;
    }
    
    // Get processed orders count
    const processedResult = await executeWithRetry(
      () => db.select({ count: orders.id })
           .from(orders)
           .where(eq(orders.status, "processed")),
      "Failed to count processed orders"
    );
    
    if (processedResult && processedResult[0]) {
      processedCount = Number(processedResult[0].count) || 0;
    }
    
    // Count user orders if userEmail is provided
    if (userEmail) {
      const userResult = await executeWithRetry(
        () => db.select({ count: orders.id })
             .from(orders)
             .where(eq(orders.userEmail, userEmail)),
        `Failed to count orders for user ${userEmail}`
      );
      
      if (userResult && userResult[0]) {
        userOrderCount = Number(userResult[0].count) || 0;
      }
    }
    
    return {
      pendingCount,
      processedCount,
      userOrderCount
    };
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
    
    return defaultCounts;
  }
};
