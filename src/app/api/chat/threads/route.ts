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

    // Get all unique users who have chat messages - modified to ensure all users with messages appear
    const threads = await neonClient`
      WITH message_users AS (
        -- First get all distinct users who have messages
        SELECT DISTINCT user_id 
        FROM chat_messages
      ),
      latest_messages AS (
        -- For each user, get their most recent message
        SELECT 
          m.id,
          m.user_id,
          m.admin_id,
          m.message,
          m.sender_type,
          m.read,
          m.created_at,
          m.updated_at
        FROM chat_messages m
        INNER JOIN (
          SELECT user_id, MAX(created_at) as max_date
          FROM chat_messages
          GROUP BY user_id
        ) latest ON m.user_id = latest.user_id AND m.created_at = latest.max_date
      ),
      unread_counts AS (
        SELECT 
          user_id,
          COUNT(*) as unread_count
        FROM 
          chat_messages
        WHERE 
          sender_type = 'user' AND read = FALSE
        GROUP BY 
          user_id
      )
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        lm.id,
        lm.user_id,
        lm.admin_id,
        lm.message,
        lm.sender_type,
        lm.read,
        lm.created_at,
        lm.updated_at,
        COALESCE(uc.unread_count, 0) as unread_count
      FROM 
        users u
      INNER JOIN 
        message_users mu ON u.id = mu.user_id
      INNER JOIN 
        latest_messages lm ON u.id = lm.user_id
      LEFT JOIN 
        unread_counts uc ON u.id = uc.user_id
      ORDER BY 
        CASE WHEN COALESCE(uc.unread_count, 0) > 0 THEN 0 ELSE 1 END,
        lm.created_at DESC
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

