import { db } from './db';
import { historyEntries, phoneEntries, orderEntries } from './schema';
import { Order } from './orderDbOperations';
import { eq, desc, and, count, sql } from 'drizzle-orm';

// Export types for history entries and phone entries
export type HistoryEntry = typeof historyEntries.$inferSelect;
export type PhoneEntry = typeof phoneEntries.$inferSelect;

/**
 * Creates a history entry when an order is processed
 * @param order The processed order
 * @param userId Optional user ID of the person who processed the order
 */
export const createHistoryEntryFromOrder = async (order: Order, userId?: string): Promise<string> => {
  try {
    // Check if database is available
    if (!db) {
      // Console statement removed for security
      throw new Error('Database connection unavailable');
    }

    // Console log removed for security
    // Console log removed for security
    
    // Categorize phone numbers
    const validNumbers: typeof order.entries = [];
    const invalidNumbers: typeof order.entries = [];
    const duplicateNumbers: typeof order.entries = [];
    const processedNumbers = new Set<string>();
    
    // First pass to find duplicates
    order.entries.forEach(entry => {
      if (processedNumbers.has(entry.number)) {
        duplicateNumbers.push(entry);
      } else {
        processedNumbers.add(entry.number);
        
        // Check if the number is valid (starts with 0 and has 10 digits)
        const isValid = /^0\d{9}$/.test(entry.number);
        if (isValid) {
          validNumbers.push(entry);
        } else {
          invalidNumbers.push(entry);
        }
      }
    });
    
    // Generate a unique history entry ID
    const historyId = `hist-${order.id}-${Date.now()}`;
    
    // Convert date string to Date object
    const orderDate = new Date(order.timestamp);
    
    // Create the history entry - log the values we're inserting
    // Now with userId field since we added it to the database
    const historyEntry = {
      id: historyId,
      date: orderDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      timestamp: order.timestamp,
      totalGB: order.totalData.toString(),
      validCount: validNumbers.length,
      invalidCount: invalidNumbers.length,
      duplicateCount: duplicateNumbers.length,
      type: 'order_processed',
      userId: userId ? parseInt(userId) : null // Convert to integer since the DB column is integer type
    };
    
    // Console log removed for security
    await db.insert(historyEntries).values(historyEntry);
    
    // Define phone entry insertion functions with proper error handling
    const insertValidEntry = async (entry: any) => {
      try {
        return await db!.insert(phoneEntries).values({
          historyEntryId: historyId,
          number: entry.number,
          allocationGB: entry.allocationGB.toString(),
          isValid: true,
          isDuplicate: false
        });
      } catch (error) {
        // Console statement removed for security
        throw error;
      }
    };
    
    const insertInvalidEntry = async (entry: any) => {
      try {
        return await db!.insert(phoneEntries).values({
          historyEntryId: historyId,
          number: entry.number,
          allocationGB: entry.allocationGB.toString(),
          isValid: false,
          isDuplicate: false
        });
      } catch (error) {
        // Console statement removed for security
        throw error;
      }
    };
    
    const insertDuplicateEntry = async (entry: any) => {
      try {
        return await db!.insert(phoneEntries).values({
          historyEntryId: historyId,
          number: entry.number,
          allocationGB: entry.allocationGB.toString(),
          isValid: true, // Duplicates are valid numbers, just duplicated
          isDuplicate: true
        });
      } catch (error) {
        // Console statement removed for security
        throw error;
      }
    };
    
    // Add phone entries for all numbers with better error handling
    // Adding phone entries statistics - logging removed for security
    
    await Promise.all([
      ...validNumbers.map(insertValidEntry),
      ...invalidNumbers.map(insertInvalidEntry),
      ...duplicateNumbers.map(insertDuplicateEntry)
    ]);
    
    // Console log removed for security
    return historyId;
  } catch (error) {
    // Console statement removed for security
    // Log more details about the error
    if (error instanceof Error) {
      // Console statement removed for security
      // Console statement removed for security
    }
    throw error;
  }
};

/**
 * Creates history entries for multiple orders
 * @param orders List of processed orders
 * @param userId Optional user ID of the person who processed the orders
 */
export const createHistoryEntriesFromOrders = async (orders: Order[], userId?: string): Promise<string[]> => {
  try {
    // Check if database is available
    if (!db) {
      // Console statement removed for security
      throw new Error('Database connection unavailable');
    }

    const historyIds: string[] = [];
    
    for (const order of orders) {
      const historyId = await createHistoryEntryFromOrder(order, userId);
      historyIds.push(historyId);
    }
    
    return historyIds;
  } catch (error) {
    // Console statement removed for security
    throw error;
  }
};

/**
 * Get all history entries, sorted by timestamp (newest first)
 */
export const getHistoryEntries = async () => {
  try {
    // Check if database is available
    if (!db) {
      // Console statement removed for security
      throw new Error('Database connection unavailable');
    }

    const entries = await db
      .select()
      .from(historyEntries)
      .orderBy(desc(historyEntries.timestamp));
    
    return entries;
  } catch (error) {
    // Console statement removed for security
    throw error;
  }
};

/**
 * Get phone entries for a specific history entry
 * @param historyEntryId The history entry ID
 */
export const getPhoneEntriesForHistory = async (historyEntryId: string) => {
  try {
    // Check if database is available
    if (!db) {
      // Console statement removed for security
      throw new Error('Database connection unavailable');
    }

    const entries = await db
      .select()
      .from(phoneEntries)
      .where(eq(phoneEntries.historyEntryId, historyEntryId));
    
    return entries;
  } catch (error) {
    // Console statement removed for security
    throw error;
  }
};

/**
 * Get the total entries count from both phone_entries and processed order_entries
 * As per requirements: total entries = count of all records in phone_entries + order_entries where status is processed
 */
export const getTotalEntries = async () => {
  try {
    // Check if database is available
    if (!db) {
      // Console statement removed for security
      throw new Error('Database connection unavailable');
    }

    // Get count of all phone_entries
    const phoneEntriesResult = await db
      .select({ count: count() })
      .from(phoneEntries);
    
    const phoneEntriesCount = phoneEntriesResult[0]?.count || 0;
    
    // Get count of all order_entries where status is 'processed'
    const orderEntriesResult = await db
      .select({ count: count() })
      .from(orderEntries)
      .where(eq(orderEntries.status, 'processed'));
    
    const processedOrderEntriesCount = orderEntriesResult[0]?.count || 0;
    
    // Calculate total entries
    const totalEntries = phoneEntriesCount + processedOrderEntriesCount;
    
    // Total entries calculation - logging removed for security
    
    return {
      totalEntries,
      phoneEntriesCount,
      processedOrderEntriesCount
    };
  } catch (error) {
    // Console statement removed for security
    throw error;
  }
};


