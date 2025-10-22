import { NextRequest, NextResponse } from "next/server";
import { db, neonClient } from "@/lib/db";
import { announcements } from "@/lib/schema";
import { sql } from "drizzle-orm";
import { getCurrentTime } from "@/lib/timeService";

// Simple in-memory cache for announcements (reduces DB queries)
let announcementsCache: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 120000; // 2 minutes cache

// Get only active announcements (public endpoint)
export async function GET(req: NextRequest) {
  try {
    // Check cache first to reduce database load
    const now = Date.now();
    if (announcementsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json(announcementsCache, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=120', // Browser cache for 2 minutes
        }
      });
    }

    // Set the content type header first thing to ensure JSON response
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=120', // Browser cache for 2 minutes
    };

    // First try using Drizzle ORM if available
    if (db) {
      try {
        const currentDate = await getCurrentTime();
        
        const result = await db.select()
          .from(announcements)
          .where(
            sql`${announcements.isActive} = true AND 
            (${announcements.startDate} <= ${currentDate} OR ${announcements.startDate} IS NULL) AND 
            (${announcements.endDate} >= ${currentDate} OR ${announcements.endDate} IS NULL)`
          )
          .orderBy(announcements.createdAt);
        
        // Update cache
        announcementsCache = result;
        cacheTimestamp = Date.now();
        
        return NextResponse.json({ announcements: result }, { headers });
      } catch (drizzleError) {
        // console.error("Drizzle query failed:", drizzleError);
        // Continue to fallback method
      }
    }
    
    // Fallback to direct SQL using neonClient if Drizzle failed or is not available
    try {
      const currentDate = (await getCurrentTime()).toISOString();
      
      const result = await neonClient`
        SELECT * FROM announcements 
        WHERE is_active = true 
        AND (start_date <= ${currentDate} OR start_date IS NULL)
        AND (end_date >= ${currentDate} OR end_date IS NULL)
        ORDER BY created_at ASC
      `;
      
      const formattedResult = result.map(row => ({
        id: row.id,
        message: row.message,
        type: row.type,
        isActive: row.is_active,
        startDate: row.start_date,
        endDate: row.end_date,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      
      // Update cache
      announcementsCache = formattedResult;
      cacheTimestamp = Date.now();
      
      return NextResponse.json({ announcements: formattedResult }, { headers });
    } catch (sqlError) {
      // console.error("Direct SQL query failed:", sqlError);
      return NextResponse.json({ 
        announcements: [],
        error: 'Database connection error' 
      }, { status: 500, headers });
    }
    
  } catch (error) {
    // console.error("Error fetching active announcements:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements", announcements: [] }, 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
