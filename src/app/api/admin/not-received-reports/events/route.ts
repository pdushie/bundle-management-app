import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addConnection, removeConnection } from '@/lib/sse/notReceivedReports';

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Create readable stream for SSE
  const readable = new ReadableStream({
    start(controller) {
      // Add connection to set
      addConnection(controller);
      
      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({ 
        type: 'connected', 
        timestamp: new Date().toISOString() 
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initialMessage));

      // Send periodic heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const heartbeatMessage = `data: ${JSON.stringify({ 
            type: 'heartbeat', 
            timestamp: new Date().toISOString() 
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeatMessage));
        } catch (error) {
          clearInterval(heartbeat);
          removeConnection(controller);
        }
      }, 30000); // Heartbeat every 30 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        removeConnection(controller);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });
    },

    cancel() {
      // This context doesn't have access to the controller, so we'll handle cleanup in abort listener
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}