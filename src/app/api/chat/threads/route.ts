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
    // Console statement removed for security
    return false;
  }
}

// Get all chat threads for admin
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin chat permission or is super_admin
    const userId = (session.user as any)?.id;
    const isSuperAdmin = session.user.role === "super_admin";
    const hasPermission = userId ? await hasAdminChatPermission(userId) : false;

    if (!isSuperAdmin && !hasPermission) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Optimized query to get chat threads with latest message and unread count
    const threads = await neonClient`
      SELECT DISTINCT ON (cm.user_id)
        cm.user_id,
        u.name as user_name,
        u.email as user_email,
        cm.id,
        cm.admin_id,
        cm.message,
        cm.sender_type,
        cm.read,
        cm.created_at,
        cm.updated_at,
        (
          SELECT COUNT(*)::int 
          FROM chat_messages 
          WHERE user_id = cm.user_id 
            AND sender_type = 'user' 
            AND read = FALSE
        ) as unread_count
      FROM 
        chat_messages cm
      INNER JOIN 
        users u ON cm.user_id = u.id
      ORDER BY 
        cm.user_id,
        cm.created_at DESC
    `;

    // Format the response
    const formattedThreads = threads.map(thread => ({
      userId: thread.user_id,
      userName: thread.user_name,
      userEmail: thread.user_email,
      lastMessage: {
        id: thread.id,
        userId: thread.user_id,
        adminId: thread.admin_id,
        message: thread.message,
        senderType: thread.sender_type,
        read: thread.read,
        createdAt: thread.created_at,
        updatedAt: thread.updated_at
      },
      unreadCount: parseInt(thread.unread_count.toString())
    }));

    return NextResponse.json({ success: true, threads: formattedThreads });
  } catch (error) {
    // Console statement removed for security
    return NextResponse.json(
      { success: false, error: "Failed to fetch chat threads" },
      { status: 500 }
    );
  }
}

