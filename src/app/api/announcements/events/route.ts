import { NextResponse } from 'next/server';
import { addConnection, removeConnection } from '@/lib/sse/announcements';

export async function GET() {
  try {
    // No authentication required for announcements as they're public

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Add to connections
        addConnection(controller);
        
        // Send initial connection message
        const initialMessage = `data: ${JSON.stringify({ type: 'connected', message: 'Announcements SSE connected' })}\n\n`;
        controller.enqueue(new TextEncoder().encode(initialMessage));
        
        // Set up heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
          try {
            const heartbeatMessage = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`;
            controller.enqueue(new TextEncoder().encode(heartbeatMessage));
          } catch (error) {
            // Controller is closed, clean up
            clearInterval(heartbeat);
            removeConnection(controller);
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
        removeConnection(controllerRef);
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
    console.error('Error in announcements SSE endpoint:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}