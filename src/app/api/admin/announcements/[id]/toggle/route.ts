import { NextRequest, NextResponse } from "next/server";
import { db, neonClient } from "@/lib/db";
import { announcements } from "@/lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { getCurrentTime } from "@/lib/timeService";

// Helper function to check if user has announcements permissions via direct database query
async function hasAdminAnnouncementsPermission(userId: string): Promise<boolean> {
  try {
    const result = await neonClient`
      SELECT p.name 
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = ${parseInt(userId)} AND p.name = 'admin.announcements' AND ur.is_active = true
    `;
    
    return result.length > 0;
  } catch (error) {
    console.error('Error checking announcements permission:', error);
    return false;
  }
}

// Toggle the active state of an announcement
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
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
    
    // Check RBAC permissions for toggling announcements
    const sessionUserId = (session.user as any)?.id;
    const isSuperAdmin = session.user.role === "super_admin";
    const hasPermission = sessionUserId ? await hasAdminAnnouncementsPermission(sessionUserId) : false;
    
    if (!isSuperAdmin && !hasPermission) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    
    const idNum = parseInt(id);
    
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "Invalid announcement ID" }, { status: 400 });
    }
    
    // Get the current announcement
    const current = await db.select()
      .from(announcements)
      .where(eq(announcements.id, idNum))
      .limit(1);
    
    if (current.length === 0) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }
    
    // Toggle the isActive state
    const [updatedAnnouncement] = await db.update(announcements)
      .set({
        isActive: !current[0].isActive,
        updatedAt: await getCurrentTime(),
      })
      .where(eq(announcements.id, idNum))
      .returning();
    
    return NextResponse.json({ 
      message: `Announcement ${updatedAnnouncement.isActive ? 'activated' : 'deactivated'} successfully`,
      announcement: updatedAnnouncement
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error(`Error toggling announcement ${id}:`, error);
    return NextResponse.json({ error: "Failed to toggle announcement" }, { status: 500 });
  }
}
