import { NextRequest, NextResponse } from 'next/server';
import { getOrderCounts } from '@/lib/orderDbOperations';
import { testConnection } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // First, test the database connection with extra logging for ECONNRESET issues
    const connectionTest = await testConnection();
    if (!connectionTest.success) {
      // console.error('Database connection test failed in order counts route:', connectionTest.error);
      
      // Check for ECONNRESET errors specifically
      const errorString = String(connectionTest.error);
      const isConnReset = errorString.includes('ECONNRESET');
      
      if (isConnReset) {
        // console.error('ECONNRESET error detected - connection reset by peer');
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
    
    // Parse the request body
    let userEmail: string | undefined;
    try {
      // Check if the request has content before trying to parse it
      const contentType = request.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await request.text();
        if (text && text.trim() !== '') {
          const data = JSON.parse(text);
          userEmail = data.userEmail;
        } else {
          // console.log('Request body is empty, proceeding without userEmail');
        }
      } else {
        // Try to get userEmail from query parameters if it exists
        const url = new URL(request.url);
        userEmail = url.searchParams.get('userEmail') || undefined;
        // console.log('No JSON content-type, checking query params for userEmail:', userEmail);
      }
    } catch (parseError) {
      // console.error('Error parsing request body:', parseError);
      // Continue without userEmail if parsing fails
    }
    
    // Get order counts with retry logic built into the function
    const counts = await getOrderCounts(userEmail);
    
    // Return the counts
    return NextResponse.json(counts);
  } catch (error) {
    // console.error('Error in order counts route:', error);
    
    // Log detailed error information
    if (error instanceof Error) {
      // console.error('Error name:', error.name);
      // console.error('Error message:', error.message);
      // console.error('Error stack:', error.stack);
      
      // Check for ECONNRESET errors in the catch block
      const isConnReset = error.message.includes('ECONNRESET') || 
                         ((error as any).cause && String((error as any).cause).includes('ECONNRESET'));
                         
      if (isConnReset) {
        // console.error('ECONNRESET error detected in catch block');
        
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
