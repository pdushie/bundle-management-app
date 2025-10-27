import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderEntries, phoneEntries, orders, users, historyEntries } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

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

export async function GET(req: NextRequest) {
  try {
    // Check if database is available
    if (!db) {
      // Console statement removed for security
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
    
    // Query order entries with direct queries to avoid relational issues - explicitly type the variable
    let orderEntriesData: any[] = [];
    try {
      // Use direct query instead of relational query
      const orderEntriesResult = await db
        .select()
        .from(orderEntries)
        .orderBy(desc(orderEntries.createdAt))
        .limit(500);
      
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
        // Console log removed for security
        if (orderResult.length > 0 && orderResult[0].processedBy) {
          // Console log removed for security
          const adminResult = await db
            .select({
              adminName: users.name,
              adminEmail: users.email
            })
            .from(users)
            .where(eq(users.id, orderResult[0].processedBy))
            .limit(1);
          
          // Console log removed for security
          adminInfo = adminResult.length > 0 ? adminResult[0] : null;
        } else {
          // Console log removed for security
        }
        
        orderEntriesData.push({
          ...entry,
          order: orderResult.length > 0 ? orderResult[0] : null,
          adminInfo: adminInfo
        });
      }
    } catch (orderError) {
      // Console statement removed for security
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
    
    // Query phone entries with admin info from history entries
    let phoneEntriesData: any[] = [];
    try {
      // Join phone_entries with history_entries and users to get admin info
      phoneEntriesData = await db
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
        .leftJoin(users, eq(historyEntries.userId, users.id))
        .orderBy(desc(phoneEntries.createdAt))
        .limit(500);
    } catch (phoneError) {
      // Console statement removed for security
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
    // Console statement removed for security
    return NextResponse.json(
      { error: "Failed to fetch order entries" },
      { status: 500 }
    );
  }
}


