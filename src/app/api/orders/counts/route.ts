import { NextRequest, NextResponse } from 'next/server';
import { getOrderCounts, getAllTimeOrderCounts } from '@/lib/orderDbOperations';
import { testConnection } from '@/lib/db';

// User-specific cache for order counts (reduces DB load)
const orderCountsCache: Map<string, {data: any, timestamp: number}> = new Map();
const COUNTS_CACHE_DURATION = 60000; // 1 minute cache

export async function POST(request: NextRequest) {
  try {
    // Parse userEmail first to create a proper cache key
    let userEmail: string | undefined;
    try {
      const contentType = request.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await request.text();
        if (text && text.trim() !== '') {
          const data = JSON.parse(text);
          userEmail = data.userEmail;
        }
      } else {
        const url = new URL(request.url);
        userEmail = url.searchParams.get('userEmail') || undefined;
      }
    } catch (parseError) {
      // Continue without userEmail if parsing fails
    }

    // Create cache key - use userEmail if provided, otherwise 'global' for general counts
    const cacheKey = userEmail || 'global';
    
    // Check user-specific cache first (especially useful for rapid polling)
    const now = Date.now();
    const cachedEntry = orderCountsCache.get(cacheKey);
    if (cachedEntry && (now - cachedEntry.timestamp) < COUNTS_CACHE_DURATION) {
      return NextResponse.json(cachedEntry.data, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        }
      });
    }

    // First, test the database connection with extra logging for ECONNRESET issues
    const connectionTest = await testConnection();
    if (!connectionTest.success) {
      // // Console statement removed for security
      
      // Check for ECONNRESET errors specifically
      const errorString = String(connectionTest.error);
      const isConnReset = errorString.includes('ECONNRESET');
      
      if (isConnReset) {
        // // Console statement removed for security
      }
      
      // Return a more specific error with a 503 Service Unavailable status
      return NextResponse.json(
        {
          pendingCount: 0,
          processedCount: 0, 
          userOrderCount: 0,
          error: isConnReset ? 'Database connection reset' : 'Database connection unavailable',
          connectionError: true,
          connectionReset: isConnReset,
          recoverable: true
        },
        { status: 503 }
      );
    }
    
    // userEmail was already parsed above for cache key
    
    // Get ALL-TIME order counts for badge display (not filtered by date)
    // This ensures badges show all pending/processed orders, not just today's
    const counts = await getAllTimeOrderCounts(userEmail);
    
    // Update user-specific cache
    orderCountsCache.set(cacheKey, {
      data: counts,
      timestamp: Date.now()
    });
    
    // Return the counts
    return NextResponse.json(counts, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      }
    });
  } catch (error) {
    // // Console statement removed for security
    
    // Log detailed error information
    if (error instanceof Error) {
      // // Console statement removed for security
      // // Console statement removed for security
      // // Console statement removed for security
      
      // Check for ECONNRESET errors in the catch block
      const isConnReset = error.message.includes('ECONNRESET') || 
                         ((error as any).cause && String((error as any).cause).includes('ECONNRESET'));
                         
      if (isConnReset) {
        // // Console statement removed for security
        
        return NextResponse.json(
          { 
            pendingCount: 0,
            processedCount: 0,
            userOrderCount: 0,
            error: 'Database connection reset',
            connectionError: true,
            connectionReset: true,
            recoverable: true
          },
          { status: 503 }
        );
      }
    }
    
    // Return a fallback response with zeros
    return NextResponse.json(
      { 
        pendingCount: 0,
        processedCount: 0,
        userOrderCount: 0,
        error: 'Failed to retrieve order counts',
        recoverable: true
      },
      { status: 500 }
    );
  }
}

// Clean up expired cache entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  orderCountsCache.forEach((entry, key) => {
    if (now - entry.timestamp > COUNTS_CACHE_DURATION * 2) { // Clean up entries older than 2x cache duration
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => orderCountsCache.delete(key));
}, COUNTS_CACHE_DURATION); // Run cleanup every cache duration