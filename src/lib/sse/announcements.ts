// SSE utility functions for announcements
const connections = new Set<ReadableStreamDefaultController>();

// Function to broadcast updates to all connected clients
export function broadcastAnnouncementUpdate(data: { type: string; [key: string]: any }) {
  console.log(`🎯 broadcastAnnouncementUpdate called with:`, data);
  console.log(`📡 Current connections: ${connections.size}`);
  
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  // Remove disconnected clients
  const deadConnections = new Set();
  
  connections.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
      console.log(`✅ Successfully sent announcement SSE to a client`);
    } catch (error) {
      console.error('❌ Error sending announcement SSE message:', error);
      deadConnections.add(controller);
    }
  });
  
  // Clean up dead connections
  deadConnections.forEach(controller => connections.delete(controller as ReadableStreamDefaultController));
  
  console.log(`📢 Broadcasted announcement update to ${connections.size} clients:`, data);
}

// Function to add a connection
export function addConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller);
  console.log(`New announcement SSE connection. Total connections: ${connections.size}`);
}

// Function to remove a connection
export function removeConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller);
  console.log(`Announcement SSE connection closed. Remaining connections: ${connections.size}`);
}

// Function to get connection count
export function getConnectionCount(): number {
  return connections.size;
}