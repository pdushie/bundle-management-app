import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderEntries, phoneEntries, orders, users, historyEntries } from "@/lib/schema";
import { and, desc, like, gte, lte, eq } from "drizzle-orm";

// Helper function to transform phone entries to match order entry format
function transformPhoneEntriesToOrderEntries(phoneEntries: any[]) {
  return phoneEntries.map(entry => ({
    id: `phone-${entry.id}`,
    orderId: entry.historyEntryId || 'history-entry',
    number: entry.number,
    allocationGB: entry.allocationGB,
    // Map the status - valid entries are considered "sent"
    status: entry.isValid && !entry.isDuplicate ? 'sent' : 'error',
    createdAt: entry.createdAt,
    // Add source field to identify the entry source
    source: 'phone_entries',
    // Include admin info if available
    adminInfo: entry.adminName ? {
      adminName: entry.adminName,
      adminEmail: entry.adminEmail
    } : null,
    // Include original data for reference
    originalEntry: entry
  }));
}

export async function POST(req: NextRequest) {
  try {
    // Check if database is available
    if (!db) {
      console.error('Database connection is not available');
      return NextResponse.json({ 
        error: 'Database connection unavailable'
      }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }
    
    // Get filter parameters from request body
    const { phoneNumber, startDate, endDate, status, processedBy } = await req.json();
    
    // Build filter conditions for order entries
    let orderConditions = [];
    
    if (phoneNumber) {
      orderConditions.push(like(orderEntries.number, `%${phoneNumber}%`));
    }
    
    if (status && status !== 'all') {
      // Use the imported eq function
      orderConditions.push(eq(orderEntries.status, status));
    }
    
    // Build date range conditions for order entries
    let orderDateCondition = null;
    if (startDate && endDate) {
      // Convert string dates to Date objects for comparison
      const start = new Date(startDate);
      // Set start date to the beginning of the day (in UTC to match database)
      start.setUTCHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      // Set end date to the end of the day (in UTC to match database)
      end.setUTCHours(23, 59, 59, 999);
      
      console.log(`Date filter: ${start.toISOString()} to ${end.toISOString()}`);
      
      orderDateCondition = and(
        gte(orderEntries.createdAt, start),
        lte(orderEntries.createdAt, end)
      );
    } else if (startDate) {
      const start = new Date(startDate);
      // Set start date to the beginning of the day (in UTC to match database)
      start.setUTCHours(0, 0, 0, 0);
      console.log(`Start date filter: ${start.toISOString()}`);
      orderDateCondition = gte(orderEntries.createdAt, start);
    } else if (endDate) {
      const end = new Date(endDate);
      // Set end date to the end of the day (in UTC to match database)
      end.setUTCHours(23, 59, 59, 999);
      console.log(`End date filter: ${end.toISOString()}`);
      orderDateCondition = lte(orderEntries.createdAt, end);
    }
    
    if (orderDateCondition) {
      orderConditions.push(orderDateCondition);
    }
    
    // Query order entries using direct queries to avoid relational issues
    let orderEntriesData: any[] = [];
    try {
      let orderEntriesResult;
      
      // If processedBy filter is specified, we need to join with orders table
      if (processedBy && processedBy !== 'all') {
        // Join order_entries with orders and filter by processedBy
        const joinConditions = [eq(orderEntries.orderId, orders.id)];
        joinConditions.push(eq(orders.processedBy, parseInt(processedBy)));
        
        // Add other order-level conditions
        if (orderConditions.length > 0) {
          joinConditions.push(...orderConditions);
        }
        
        orderEntriesResult = await db
          .select({
            id: orderEntries.id,
            orderId: orderEntries.orderId,
            number: orderEntries.number,
            allocationGB: orderEntries.allocationGB,
            status: orderEntries.status,
            createdAt: orderEntries.createdAt,
            cost: orderEntries.cost
          })
          .from(orderEntries)
          .innerJoin(orders, eq(orderEntries.orderId, orders.id))
          .where(and(...joinConditions))
          .orderBy(desc(orderEntries.createdAt))
          .limit(500);
      } else {
        // Original logic for when no processedBy filter
        if (orderConditions.length > 0) {
          orderEntriesResult = await db
            .select()
            .from(orderEntries)
            .where(and(...orderConditions))
            .orderBy(desc(orderEntries.createdAt))
            .limit(500);
        } else {
          orderEntriesResult = await db
            .select()
            .from(orderEntries)
            .orderBy(desc(orderEntries.createdAt))
            .limit(500);
        }
      }
      
      // Get associated order data and admin info for each entry
      orderEntriesData = [];
      for (const entry of orderEntriesResult) {
        const orderResult = await db
          .select({
            id: orders.id,
            status: orders.status,
            processedBy: orders.processedBy,
            processedAt: orders.processedAt,
            userName: orders.userName,
            userEmail: orders.userEmail
          })
          .from(orders)
          .where(eq(orders.id, entry.orderId))
          .limit(1);
        
        let adminInfo = null;
        console.log('Filter API - Order result for entry:', entry.id, 'orderResult:', orderResult);
        if (orderResult.length > 0 && orderResult[0].processedBy) {
          console.log('Filter API - Looking up admin for processedBy:', orderResult[0].processedBy);
          const adminResult = await db
            .select({
              adminName: users.name,
              adminEmail: users.email
            })
            .from(users)
            .where(eq(users.id, orderResult[0].processedBy))
            .limit(1);
          
          console.log('Filter API - Admin lookup result:', adminResult);
          adminInfo = adminResult.length > 0 ? adminResult[0] : null;
        } else {
          console.log('Filter API - No processedBy found for order:', orderResult.length > 0 ? orderResult[0] : 'no order');
        }
        
        orderEntriesData.push({
          ...entry,
          order: orderResult.length > 0 ? orderResult[0] : null,
          adminInfo: adminInfo
        });
      }
    } catch (orderError) {
      console.error('Error fetching order entries:', orderError);
      return NextResponse.json(
        { error: 'Failed to fetch order entries', details: orderError instanceof Error ? orderError.message : String(orderError) },
        { status: 500 }
      );
    }
    
    // Add source field to identify these as order entries
    const formattedOrderEntries = orderEntriesData.map(entry => ({
      ...entry,
      source: 'order_entries'
    }));
    
    // Build filter conditions for phone entries
    let phoneConditions = [];
    
    if (phoneNumber) {
      phoneConditions.push(like(phoneEntries.number, `%${phoneNumber}%`));
    }
    
    // Handle status filter for phone entries
    if (status && status !== 'all') {
      if (status === 'sent') {
        // Valid and non-duplicate entries are considered "sent"
        phoneConditions.push(eq(phoneEntries.isValid, true));
        phoneConditions.push(eq(phoneEntries.isDuplicate, false));
      } else if (status === 'error') {
        // Invalid or duplicate entries are considered "error"
        phoneConditions.push(
          and(
            eq(phoneEntries.isValid, false),
            eq(phoneEntries.isDuplicate, true)
          )
        );
      }
      // 'pending' doesn't apply to phone entries
    }
    
    // Handle processedBy filter for phone entries (filter by admin who processed them)
    if (processedBy && processedBy !== 'all') {
      phoneConditions.push(eq(historyEntries.userId, parseInt(processedBy)));
    }
    
    // Build date range conditions for phone entries
    let phoneDateCondition = null;
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      
      phoneDateCondition = and(
        gte(phoneEntries.createdAt, start),
        lte(phoneEntries.createdAt, end)
      );
    } else if (startDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      phoneDateCondition = gte(phoneEntries.createdAt, start);
    } else if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      phoneDateCondition = lte(phoneEntries.createdAt, end);
    }
    
    if (phoneDateCondition) {
      phoneConditions.push(phoneDateCondition);
    }
    
    // Query phone entries with admin info from history entries
    let phoneEntriesData: any[] = [];
    try {
      // Join phone_entries with history_entries and users to get admin info
      const phoneBaseQuery = db
        .select({
          // Phone entry fields
          id: phoneEntries.id,
          historyEntryId: phoneEntries.historyEntryId,
          number: phoneEntries.number,
          allocationGB: phoneEntries.allocationGB,
          isValid: phoneEntries.isValid,
          isDuplicate: phoneEntries.isDuplicate,
          createdAt: phoneEntries.createdAt,
          // Admin info from history entries
          adminName: users.name,
          adminEmail: users.email,
          userId: historyEntries.userId
        })
        .from(phoneEntries)
        .leftJoin(historyEntries, eq(phoneEntries.historyEntryId, historyEntries.id))
        .leftJoin(users, eq(historyEntries.userId, users.id));
      
      if (phoneConditions.length > 0) {
        phoneEntriesData = await phoneBaseQuery
          .where(and(...phoneConditions))
          .orderBy(desc(phoneEntries.createdAt))
          .limit(500);
      } else {
        phoneEntriesData = await phoneBaseQuery
          .orderBy(desc(phoneEntries.createdAt))
          .limit(500);
      }
    } catch (phoneError) {
      console.warn('Error fetching phone entries, continuing without them:', phoneError);
      phoneEntriesData = [];
    }
    
    // Transform phone entries to match order entries format
    const transformedPhoneEntries = transformPhoneEntriesToOrderEntries(phoneEntriesData);
    
    // Combine the results
    const combinedEntries = [...formattedOrderEntries, ...transformedPhoneEntries];
    
    // Sort by createdAt date in descending order
    combinedEntries.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ 
      orderEntries: combinedEntries,
      success: true
    });
    
  } catch (error) {
    console.error("Error filtering order entries:", error);
    return NextResponse.json(
      { error: "Failed to filter order entries", details: (error as Error).message },
      { status: 500 }
    );
  }
}
