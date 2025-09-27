import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderEntries } from "@/lib/schema";
import { desc } from "drizzle-orm";

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
    const entries = await db.query.orderEntries.findMany({
      orderBy: [desc(orderEntries.createdAt)],
      limit: 1000, // Limit to 1000 most recent entries
      // Relations will work now that we've defined them properly
      with: {
        order: true,
      },
    });

    return NextResponse.json({ 
      orderEntries: entries,
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
