import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderEntries, phoneEntries, orders } from "@/lib/schema";
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
    // Include original data for reference
    originalEntry: entry
  }));
}

export async function GET(req: NextRequest) {
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
    
    // Query order entries with direct queries to avoid relational issues - explicitly type the variable
    let orderEntriesData: any[] = [];
    try {
      // Use direct query instead of relational query
      const orderEntriesResult = await db
        .select()
        .from(orderEntries)
        .orderBy(desc(orderEntries.createdAt))
        .limit(500);
      
      // Get associated order data for each entry
      orderEntriesData = [];
      for (const entry of orderEntriesResult) {
        const orderResult = await db
          .select()
          .from(orders)
          .where(eq(orders.id, entry.orderId))
          .limit(1);
        
        orderEntriesData.push({
          ...entry,
          order: orderResult.length > 0 ? orderResult[0] : null
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
    
    // Query phone entries with direct query - explicitly type the variable
    let phoneEntriesData: any[] = [];
    try {
      // Use direct query for phone entries
      phoneEntriesData = await db
        .select()
        .from(phoneEntries)
        .orderBy(desc(phoneEntries.createdAt))
        .limit(500);
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
    console.error("Error fetching order entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch order entries" },
      { status: 500 }
    );
  }
}
