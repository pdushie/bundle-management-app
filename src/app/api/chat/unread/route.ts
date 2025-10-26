import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { neonClient } from "@/lib/db";

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

    // Only admin and super_admin can access this endpoint
    if (session.user.role !== "admin" && session.user.role !== "super_admin") {
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
