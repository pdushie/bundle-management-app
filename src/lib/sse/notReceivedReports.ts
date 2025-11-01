// SSE utility for not-received-reports events

// Store active connections
const connections = new Set<ReadableStreamDefaultController>();

// Function to broadcast updates to all connected clients
export function broadcastReportUpdate(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  connections.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      // Remove failed connections
      connections.delete(controller);
    }
  });
}

// Function to add a connection (used by the API route)
export function addConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller);
}

// Function to remove a connection (used by the API route)
export function removeConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller);
}

// Function to get connection count (for debugging)
export function getConnectionCount(): number {
  return connections.size;
}