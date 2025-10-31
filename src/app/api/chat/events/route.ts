import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Store active connections
const connections = new Set<ReadableStreamDefaultController>();

// Function to broadcast updates to all connected clients
export function broadcastChatUpdate(data: { type: string; [key: string]: any }) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  // Remove disconnected clients
  const deadConnections = new Set();
  
  connections.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      console.error('Error sending SSE message:', error);
      deadConnections.add(controller);
    }
  });
  
  // Clean up dead connections
  deadConnections.forEach(controller => connections.delete(controller as ReadableStreamDefaultController));
  
  console.log(`Broadcasted chat update to ${connections.size} clients:`, data);
}

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('Chat SSE: Unauthorized access attempt');
      return new NextResponse('Unauthorized - Please log in to access chat events', { 
        status: 401,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }
    
    console.log(`Chat SSE: Authenticated user ${session.user.email} connecting...`);

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Add to connections
        connections.add(controller);
        console.log(`New chat SSE connection. Total connections: ${connections.size}`);
        
        // Send initial connection message
        const initialMessage = `data: ${JSON.stringify({ type: 'connected', message: 'Chat SSE connected' })}\n\n`;
        controller.enqueue(new TextEncoder().encode(initialMessage));
        
        // Set up heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
          try {
            if (connections.has(controller)) {
              const heartbeatMessage = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`;
              controller.enqueue(new TextEncoder().encode(heartbeatMessage));
            } else {
              clearInterval(heartbeat);
            }
          } catch (error) {
            // Controller is closed, clean up
            clearInterval(heartbeat);
            connections.delete(controller);
          }
        }, 15000); // Send heartbeat every 15 seconds
        
        // Store heartbeat interval for cleanup
        (controller as any).heartbeatInterval = heartbeat;
      },
      
      cancel() {
        // Clean up when client disconnects
        const controllerRef = this as any;
        if (controllerRef.heartbeatInterval) {
          clearInterval(controllerRef.heartbeatInterval);
          controllerRef.heartbeatInterval = null;
        }
        connections.delete(controllerRef);
        console.log(`Chat SSE connection closed. Remaining connections: ${connections.size}`);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('Error in chat SSE endpoint:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}