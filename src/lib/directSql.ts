// Add direct SQL support to the orderDbOperations.ts file
import { db, neonClient } from './db';
import { orders, orderEntries } from './schema';
import { eq, desc, asc, and } from 'drizzle-orm';

// Direct SQL getOrderCounts function to bypass Drizzle ORM issues
export async function getOrderCountsDirectSQL(userEmail?: string): Promise<{
  pendingCount: number;
  processedCount: number;
  userOrderCount: number;
}> {
  try {
    // Using direct SQL to get order counts - logging removed for security
    
    // Get pending orders count using direct SQL with proper single quotes
    const pendingResult = await neonClient`SELECT COUNT(*) FROM orders WHERE status = 'pending'`;
    const pendingCount = parseInt(pendingResult[0]?.count || '0', 10);
    
    // Get processed orders count using direct SQL with proper single quotes
    const processedResult = await neonClient`SELECT COUNT(*) FROM orders WHERE status = 'processed'`;
    const processedCount = parseInt(processedResult[0]?.count || '0', 10);
    
    // Get user orders count if userEmail is provided
    let userOrderCount = 0;
    if (userEmail) {
      const userResult = await neonClient`
        SELECT COUNT(*) FROM orders WHERE user_email = ${userEmail}
      `;
      userOrderCount = parseInt(userResult[0]?.count || '0', 10);
    }
    
    // Direct SQL order counts - logging removed for security
    
    return {
      pendingCount,
      processedCount,
      userOrderCount
    };
  } catch (error) {
    // Console statement removed for security
    return {
      pendingCount: 0,
      processedCount: 0,
      userOrderCount: 0
    };
  }
}

