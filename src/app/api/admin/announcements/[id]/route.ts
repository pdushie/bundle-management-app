import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { announcements } from "@/lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { eq } from "drizzle-orm";

// Get a specific announcement by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Next.js 15 requires awaiting params
    
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
    
    // Only allow admins and superadmins to get specific announcements
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const announcementId = parseInt(id);
    
    if (isNaN(announcementId)) {
      return NextResponse.json({ error: "Invalid announcement ID" }, { status: 400 });
    }
    
    const result = await db.select()
      .from(announcements)
      .where(eq(announcements.id, announcementId))
      .limit(1);
    
    if (result.length === 0) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }
    
    return NextResponse.json({ announcement: result[0] });
  } catch (error) {
    console.error(`Error fetching announcement:`, error);
    return NextResponse.json({ error: "Failed to fetch announcement" }, { status: 500 });
  }
}

// Update a specific announcement
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Next.js 15 requires awaiting params
    
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
    
    // Only allow admins and superadmins to update announcements
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const announcementId = parseInt(id);
    
    if (isNaN(announcementId)) {
      return NextResponse.json({ error: "Invalid announcement ID" }, { status: 400 });
    }
    
    const body = await req.json();
    const { message, type, isActive, startDate, endDate } = body;
    
    // Basic validation
    if (!message) {
      return NextResponse.json({ 
        error: "Message is required" 
      }, { status: 400 });
    }
    
    // Parse dates if provided
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : null;
    
    // Check if end date is after start date
    if (parsedEndDate && parsedStartDate && parsedStartDate > parsedEndDate) {
      return NextResponse.json({ 
        error: "End date must be after start date" 
      }, { status: 400 });
    }
    
    // Check if announcement exists
    const existing = await db.select()
      .from(announcements)
      .where(eq(announcements.id, announcementId))
      .limit(1);
    
    if (existing.length === 0) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }
    
    // Update the announcement
    const [updatedAnnouncement] = await db.update(announcements)
      .set({
        message,
        type: type || 'info',
        isActive: isActive !== undefined ? isActive : true,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        // Don't update createdBy
        updatedAt: new Date(),
      })
      .where(eq(announcements.id, announcementId))
      .returning();
    
    return NextResponse.json({ 
      message: "Announcement updated successfully",
      announcement: updatedAnnouncement
    });
  } catch (error) {
    console.error(`Error updating announcement:`, error);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
}

// Delete a specific announcement
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Next.js 15 requires awaiting params
    
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
    
    // Only allow admins and superadmins to delete announcements
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const announcementId = parseInt(id);
    
    if (isNaN(announcementId)) {
      return NextResponse.json({ error: "Invalid announcement ID" }, { status: 400 });
    }
    
    // Check if announcement exists
    const existing = await db.select()
      .from(announcements)
      .where(eq(announcements.id, announcementId))
      .limit(1);
    
    if (existing.length === 0) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }
    
    // Delete the announcement
    const deletedAnnouncement = await db.delete(announcements)
      .where(eq(announcements.id, announcementId))
      .returning();
    
    return NextResponse.json({ 
      message: "Announcement deleted successfully",
      announcement: deletedAnnouncement[0]
    });
  } catch (error) {
    console.error(`Error deleting announcement:`, error);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}
