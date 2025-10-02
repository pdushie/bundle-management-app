import { NextRequest, NextResponse } from "next/server";
import { db, neonClient } from "@/lib/db";
import { announcements, users } from "@/lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { desc, sql, eq } from "drizzle-orm";

// Get all announcements (admin only)
export async function GET(req: NextRequest) {
  try {
    // Set the content type header first thing to ensure JSON response
    const headers = {
      'Content-Type': 'application/json'
    };

    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers });
    }
    
    // Check if the request is for active announcements only.
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    // If active only and user is not admin/superadmin, show active announcements
    // Otherwise, only allow admins and superadmins to see all announcements
    if (!activeOnly && session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403, headers });
    }
    
    // First try using Drizzle ORM if available
    if (db) {
      try {
        let result;
        
        // Filter by active status if requested
        if (activeOnly) {
          const currentDate = new Date();
          result = await db.select()
            .from(announcements)
            .where(
              sql`${announcements.isActive} = true AND 
              (${announcements.startDate} <= ${currentDate} OR ${announcements.startDate} IS NULL) AND 
              (${announcements.endDate} >= ${currentDate} OR ${announcements.endDate} IS NULL)`
            )
            .orderBy(desc(announcements.createdAt));
        } else {
          result = await db.select()
            .from(announcements)
            .orderBy(desc(announcements.createdAt));
        }
        
        return NextResponse.json({ announcements: result }, { headers });
      } catch (drizzleError) {
        console.error("Drizzle query failed:", drizzleError);
        // Continue to fallback method
      }
    }
    
    // Fallback to direct SQL using neonClient if Drizzle failed or is not available
    try {
      const currentDate = new Date().toISOString();
      
      let result;
      if (activeOnly) {
        result = await neonClient`
          SELECT * FROM announcements 
          WHERE is_active = true 
          AND (start_date <= ${currentDate} OR start_date IS NULL)
          AND (end_date >= ${currentDate} OR end_date IS NULL)
          ORDER BY created_at DESC
        `;
      } else {
        result = await neonClient`
          SELECT * FROM announcements 
          ORDER BY created_at DESC
        `;
      }
      
      // Format the results to match the expected schema
      const formattedResults = result.map(row => ({
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
      
      return NextResponse.json({ announcements: formattedResults }, { headers });
    } catch (sqlError) {
      console.error("Direct SQL query failed:", sqlError);
      return NextResponse.json({ 
        announcements: [],
        error: 'Database connection error' 
      }, { status: 500, headers });
    }
    
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements", announcements: [] }, 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Create a new announcement (admin only)
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
    
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Only allow admins and superadmins to create announcements
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    // Get the user ID from the database using email
    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json({ error: "No email found in session" }, { status: 400 });
    }
    
    const userRecord = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
    if (userRecord.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const userId = userRecord[0].id;
    
    const body = await req.json();
    const { message, type, isActive, startDate, endDate } = body;
    
    // Basic validation
    if (!message) {
      return NextResponse.json({ 
        error: "Message is required" 
      }, { status: 400 });
    }
    
    // Parse dates if provided
    const parsedStartDate = startDate ? new Date(startDate) : new Date();
    const parsedEndDate = endDate ? new Date(endDate) : null;
    
    // Check if end date is after start date
    if (parsedEndDate && parsedStartDate > parsedEndDate) {
      return NextResponse.json({ 
        error: "End date must be after start date" 
      }, { status: 400 });
    }
    
    // Insert the announcement
    const [newAnnouncement] = await db.insert(announcements).values({
      message,
      type: type || 'info',
      isActive: isActive !== undefined ? isActive : true,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      createdBy: userId,
    }).returning();
    
    return NextResponse.json({ 
      message: "Announcement created successfully",
      announcement: newAnnouncement
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}
