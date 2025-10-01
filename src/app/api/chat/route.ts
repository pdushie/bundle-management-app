import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { neonClient } from "@/lib/db";

// Get all messages for a user (as a user or admin)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(req.nextUrl.searchParams.get("userId") || "0");
    
    // If admin is querying for a specific user's messages
    if (
      (session.user.role === "admin" || session.user.role === "superadmin") &&
      userId > 0
    ) {
      const messages = await neonClient`
        SELECT * FROM chat_messages 
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
      `;
      
      // Mark all messages as read for admin
      await neonClient`
        UPDATE chat_messages 
        SET read = TRUE 
        WHERE user_id = ${userId} AND sender_type = 'user' AND read = FALSE
      `;

      // Transform column names from snake_case to camelCase
      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        userId: msg.user_id,
        adminId: msg.admin_id,
        message: msg.message,
        senderType: msg.sender_type,
        read: msg.read,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at
      }));
      
      return NextResponse.json({ success: true, messages: formattedMessages });
    }
    
    // Regular user getting their own messages
    const userIdFromSession = (session.user as { id: number }).id;
    const messages = await neonClient`
      SELECT * FROM chat_messages 
      WHERE user_id = ${userIdFromSession}
      ORDER BY created_at ASC
    `;
    
    // Mark all messages as read for user
    await neonClient`
      UPDATE chat_messages 
      SET read = TRUE 
      WHERE user_id = ${userIdFromSession} AND sender_type = 'admin' AND read = FALSE
    `;

    // Transform column names from snake_case to camelCase
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      userId: msg.user_id,
      adminId: msg.admin_id,
      message: msg.message,
      senderType: msg.sender_type,
      read: msg.read,
      createdAt: msg.created_at,
      updatedAt: msg.updated_at
    }));
    
    return NextResponse.json({ success: true, messages: formattedMessages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// Send a new message
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, recipientId } = body;
    
    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    const senderType = session.user.role === "admin" || session.user.role === "superadmin" ? "admin" : "user";
    
    // Ensure session.user.id exists
    const userId = (session.user as { id: number }).id;
    
    // If admin is sending a message to a user
    if (senderType === "admin" && recipientId) {
      const result = await neonClient`
        INSERT INTO chat_messages 
        (user_id, admin_id, message, sender_type, read)
        VALUES (${recipientId}, ${userId}, ${message}, ${senderType}, FALSE)
        RETURNING *
      `;

      // Transform column names from snake_case to camelCase
      const formattedMessage = {
        id: result[0].id,
        userId: result[0].user_id,
        adminId: result[0].admin_id,
        message: result[0].message,
        senderType: result[0].sender_type,
        read: result[0].read,
        createdAt: result[0].created_at,
        updatedAt: result[0].updated_at
      };
      
      return NextResponse.json({ success: true, message: formattedMessage });
    }
    
    // Regular user sending a message (to admin)
    const result = await neonClient`
      INSERT INTO chat_messages 
      (user_id, message, sender_type, read)
      VALUES (${userId}, ${message}, ${senderType}, FALSE)
      RETURNING *
    `;

    // Transform column names from snake_case to camelCase
    const formattedMessage = {
      id: result[0].id,
      userId: result[0].user_id,
      adminId: result[0].admin_id,
      message: result[0].message,
      senderType: result[0].sender_type,
      read: result[0].read,
      createdAt: result[0].created_at,
      updatedAt: result[0].updated_at
    };
    
    return NextResponse.json({ success: true, message: formattedMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send message" },
      { status: 500 }
    );
  }
}
