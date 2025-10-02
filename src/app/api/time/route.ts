import { NextRequest, NextResponse } from "next/server";

/**
 * Server Time API Endpoint
 * Provides accurate server time as a fallback when external time services fail
 */
export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    
    return NextResponse.json({
      timestamp: now.getTime(),
      datetime: now.toISOString(),
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      utc: {
        timestamp: now.getTime(),
        datetime: now.toISOString(),
        date: now.toISOString().split('T')[0],
        time: now.toISOString().split('T')[1].split('.')[0]
      }
    });
  } catch (error) {
    console.error("Error getting server time:", error);
    return NextResponse.json(
      { error: "Failed to get server time" }, 
      { status: 500 }
    );
  }
}
