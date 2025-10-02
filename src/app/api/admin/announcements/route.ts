import { NextRequest, NextResponse } from "next/server";
import { db, neonClient } from "@/lib/db";
import { announcements } from "@/lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { eq } from "drizzle-orm";

// Get a specific announcement by ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; // Next.js 15 requires awaiting params
    
    // Set the content type header first thing to ensure JSON response
    const headers = {
      'Content-Type': 'application/json'
    };

    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers });
    }

    // Check if the request is for active announcements only
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    // If not requesting active only, require admin/superadmin role
    if (!activeOnly && session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403, headers });
    }

    const announcementId = parseInt(id);
    if (isNaN(announcementId)) {
      return NextResponse.json({ error: "Invalid announcement ID" }, { status: 400, headers });
    }

    // First try using Drizzle ORM if available
    if (db) {
      try {
        const result = await db.select().from(announcements).where(eq(announcements.id, announcementId)).limit(1);
        
        if (result.length === 0) {
          return NextResponse.json({ error: "Announcement not found" }, { status: 404, headers });
        }

        const announcement = result[0];

        // If requesting active only, check if announcement is currently active
        if (activeOnly) {
          const currentDate = new Date();
          const isActive = announcement.isActive && 
            (!announcement.startDate || announcement.startDate <= currentDate) &&
            (!announcement.endDate || announcement.endDate >= currentDate);
          
          if (!isActive) {
            return NextResponse.json({ error: "Announcement not found" }, { status: 404, headers });
          }
        }
        
        return NextResponse.json({ announcement }, { headers });
      } catch (drizzleError) {
        console.error("Drizzle query failed:", drizzleError);
        // Continue to fallback method
      }
    }

    // Fallback to direct SQL using neonClient if Drizzle failed or is not available
    try {
      const result = await neonClient`
        SELECT * FROM announcements WHERE id = ${announcementId} LIMIT 1
      `;
      
      if (result.length === 0) {
        return NextResponse.json({ error: "Announcement not found" }, { status: 404, headers });
      }

      const row = result[0];
      const announcement = {
        id: row.id,
        message: row.message,
        type: row.type,
        isActive: row.is_active,
        startDate: row.start_date,
        endDate: row.end_date,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      // If requesting active only, check if announcement is currently active
      if (activeOnly) {
        const currentDate = new Date();
        const isActive = announcement.isActive && 
          (!announcement.startDate || new Date(announcement.startDate) <= currentDate) &&
          (!announcement.endDate || new Date(announcement.endDate) >= currentDate);
        
        if (!isActive) {
          return NextResponse.json({ error: "Announcement not found" }, { status: 404, headers });
        }
      }
      
      return NextResponse.json({ announcement }, { headers });
    } catch (sqlError) {
      console.error("Direct SQL query failed:", sqlError);
      return NextResponse.json({ 
        error: 'Database connection error' 
      }, { status: 500, headers });
    }

  } catch (error) {
    console.error("Error fetching announcement:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcement" }, 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Update a specific announcement by ID
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; // Next.js 15 requires awaiting params
    
    // Check if database is available
    if (!db) {
      console.error('Database connection is not available');
      return NextResponse.json({ 
        error: 'Database connection unavailable'
      }, { status: 500
