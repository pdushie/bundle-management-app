import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { neonClient } from "@/lib/db";

// Helper function to check if user has chat permissions via direct database query
async function hasAdminChatPermission(userId: string): Promise<boolean> {
  try {
    const result = await neonClient`
      SELECT p.name 
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = ${parseInt(userId)} AND p.name = 'admin.chat'
    `;
    
    return result.length > 0;
  } catch (error) {
    console.error('Error checking chat permission:', error);
    return false;
  }
}

// Get count of unread chat messages for admin
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    // Check if user has admin chat permission or is super_admin
    const userId = (session.user as any)?.id;
    const isSuperAdmin = session.user.role === "super_admin";
    const hasPermission = userId ? await hasAdminChatPermission(userId) : false;

    if (!isSuperAdmin && !hasPermission) {
      return NextResponse.json(
        { success: false, error: "Forbidden" }, 
        { status: 403 }
      );
    }

    // console.log(`API access: /api/chat/unread by user ${(session.user as any).id} (${session.user.role})`);

    // Get count of all unread messages from users
    const unreadCountResult = await neonClient`
      SELECT COUNT(*) as count
      FROM chat_messages
      WHERE sender_type = 'user' AND read = FALSE
    `;
    
    const unreadCount = parseInt(unreadCountResult[0]?.count || "0");
    
    return NextResponse.json({ 
      success: true, 
      unreadCount
    });
  } catch (error) {
    // console.error("Error fetching unread message count:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch unread message count" }, 
      { status: 500 }
    );
  }
}
