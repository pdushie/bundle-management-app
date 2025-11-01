// Debug script to capture SSE data and identify malformed JSON
import http from 'http';

// Simple SSE client to debug the endpoints
function debugSSEEndpoint(endpoint) {
  const url = `http://localhost:3000/api/${endpoint}/events`;
  
  console.log(`🔍 Debugging SSE endpoint: ${url}`);
  
  const clientReq = http.get(url, {
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache'
    }
  }, (serverRes) => {
    console.log(`📡 Connected to ${url}`);
    console.log(`Status: ${serverRes.statusCode}`);
    console.log(`Headers:`, serverRes.headers);
    
    let buffer = '';
    
    serverRes.on('data', (chunk) => {
      const data = chunk.toString();
      buffer += data;
      
      console.log(`📥 Raw chunk received:`, JSON.stringify(data));
      
      // Process complete messages (ending with \n\n)
      const messages = buffer.split('\n\n');
      buffer = messages.pop() || ''; // Keep incomplete message in buffer
      
      messages.forEach((message, index) => {
        if (message.trim()) {
          console.log(`📨 Message ${index + 1}:`, JSON.stringify(message));
          
          // Extract data portion
          const dataMatch = message.match(/^data: (.+)$/m);
          if (dataMatch) {
            const jsonData = dataMatch[1];
            console.log(`🧪 JSON to parse:`, JSON.stringify(jsonData));
            console.log(`📏 JSON length: ${jsonData.length} characters`);
            
            // Show character positions around position 134
            if (jsonData.length >= 134) {
              const start = Math.max(0, 134 - 20);
              const end = Math.min(jsonData.length, 134 + 20);
              console.log(`🎯 Characters around position 134 (${start}-${end}):`, JSON.stringify(jsonData.substring(start, end)));
              console.log(`🎯 Character at position 134:`, JSON.stringify(jsonData.charAt(133))); // 0-indexed
            }
            
            try {
              const parsed = JSON.parse(jsonData);
              console.log(`✅ Successfully parsed:`, parsed);
            } catch (error) {
              console.error(`❌ JSON Parse Error:`, error.message);
              console.error(`❌ Failed JSON:`, jsonData);
              
              // Show each line with line numbers
              const lines = jsonData.split('\n');
              lines.forEach((line, idx) => {
                console.log(`Line ${idx + 1}: ${JSON.stringify(line)}`);
              });
            }
          }
        }
      });
    });
    
    serverRes.on('end', () => {
      console.log(`🔚 SSE connection ended for ${url}`);
    });
    
    serverRes.on('error', (error) => {
      console.error(`❌ SSE connection error for ${url}:`, error);
    });
  });
  
  clientReq.on('error', (error) => {
    console.error(`❌ Request error for ${url}:`, error);
  });
  
  // Keep connection alive for 30 seconds
  setTimeout(() => {
    console.log(`⏰ Closing connection to ${url} after 30 seconds`);
    clientReq.destroy();
  }, 30000);
}

console.log(`🔍 Starting SSE debug for all endpoints...`);
console.log(`📋 Testing endpoints:`);
console.log(`   - announcements`);
console.log(`   - chat`);
console.log(`   - admin/not-received-reports`);
console.log('');

// Debug all SSE endpoints
debugSSEEndpoint('announcements');
setTimeout(() => debugSSEEndpoint('chat'), 5000);
setTimeout(() => debugSSEEndpoint('admin/not-received-reports'), 10000);