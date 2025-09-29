import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderEntries, phoneEntries } from "@/lib/schema";
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
    // Include original data for reference
    originalEntry: entry
  }));
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }
    
    // Get filter parameters from request body
    const { phoneNumber, startDate, endDate, status } = await req.json();
    
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
    
    // Query order entries
    let orderEntriesData;
    if (orderConditions.length > 0) {
      orderEntriesData = await db.query.orderEntries.findMany({
        where: and(...orderConditions),
        orderBy: [desc(orderEntries.createdAt)],
        limit: 500, // Reduced limit to accommodate phone entries
        with: {
          order: true,
        },
      });
    } else {
      orderEntriesData = await db.query.orderEntries.findMany({
        orderBy: [desc(orderEntries.createdAt)],
        limit: 500, // Reduced limit to accommodate phone entries
        with: {
          order: true,
        },
      });
    }
    
    // Add source field to identify these as order entries
    const formattedOrderEntries = orderEntriesData.map(entry => ({
      ...entry,
      source: 'order_entries'
    }));
    
    // Query phone entries
    let phoneEntriesData;
    if (phoneConditions.length > 0) {
      phoneEntriesData = await db.query.phoneEntries.findMany({
        where: and(...phoneConditions),
        orderBy: [desc(phoneEntries.createdAt)],
        limit: 500,
        with: {
          historyEntry: true,
        },
      });
    } else {
      phoneEntriesData = await db.query.phoneEntries.findMany({
        orderBy: [desc(phoneEntries.createdAt)],
        limit: 500,
        with: {
          historyEntry: true,
        },
      });
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
