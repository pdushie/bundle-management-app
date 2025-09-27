import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderEntries } from "@/lib/schema";
import { and, desc, like, gte, lte } from "drizzle-orm";

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
    
    // Build filter conditions
    let conditions = [];
    
    if (phoneNumber) {
      conditions.push(like(orderEntries.number, `%${phoneNumber}%`));
    }
    
    if (status && status !== 'all') {
      conditions.push(orderEntries.status.equals(status));
    }
    
    if (startDate && endDate) {
      // Convert string dates to Date objects for comparison
      const start = new Date(startDate);
      // Set start date to the beginning of the day (in UTC to match database)
      start.setUTCHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      // Set end date to the end of the day (in UTC to match database)
      end.setUTCHours(23, 59, 59, 999);
      
      console.log(`Date filter: ${start.toISOString()} to ${end.toISOString()}`);
      
      conditions.push(
        and(
          gte(orderEntries.createdAt, start),
          lte(orderEntries.createdAt, end)
        )
      );
    } else if (startDate) {
      const start = new Date(startDate);
      // Set start date to the beginning of the day (in UTC to match database)
      start.setUTCHours(0, 0, 0, 0);
      console.log(`Start date filter: ${start.toISOString()}`);
      conditions.push(gte(orderEntries.createdAt, start));
    } else if (endDate) {
      const end = new Date(endDate);
      // Set end date to the end of the day (in UTC to match database)
      end.setUTCHours(23, 59, 59, 999);
      console.log(`End date filter: ${end.toISOString()}`);
      conditions.push(lte(orderEntries.createdAt, end));
    }
    
    // If no conditions are specified, don't add a where clause
    let entries;
    if (conditions.length > 0) {
      entries = await db.query.orderEntries.findMany({
        where: and(...conditions),
        orderBy: [desc(orderEntries.createdAt)],
        limit: 1000, // Limit to 1000 entries for performance
        // Relations will work now that we've defined them properly
        with: {
          order: true,
        },
      });
    } else {
      entries = await db.query.orderEntries.findMany({
        orderBy: [desc(orderEntries.createdAt)],
        limit: 1000, // Limit to 1000 entries for performance
        // Relations will work now that we've defined them properly
        with: {
          order: true,
        },
      });
    }

    return NextResponse.json({ 
      orderEntries: entries,
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
