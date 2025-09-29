import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderEntries, phoneEntries } from "@/lib/schema";
import { desc } from "drizzle-orm";

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
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }
    
    // Query order entries with a limit for performance
    const orderEntriesData = await db.query.orderEntries.findMany({
      orderBy: [desc(orderEntries.createdAt)],
      limit: 500, // Reduced limit to accommodate phone entries
      with: {
        order: true,
      },
    });
    
    // Add source field to identify these as order entries
    const formattedOrderEntries = orderEntriesData.map(entry => ({
      ...entry,
      source: 'order_entries'
    }));
    
    // Query phone entries as well
    const phoneEntriesData = await db.query.phoneEntries.findMany({
      orderBy: [desc(phoneEntries.createdAt)],
      limit: 500, // Limit to 500 most recent entries
      with: {
        historyEntry: true,
      },
    });
    
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
