import { neonClient, testConnection } from './db';
import { NextResponse } from 'next/server';

/**
 * Helper function to execute database queries with proper error handling
 * @param queryFn Function that executes the actual database query
 * @param errorMessage Custom error message to return on failure
 */
export async function executeDbQuery<T>(
  queryFn: () => Promise<T>,
  errorMessage: string = 'Database operation failed'
): Promise<{ 
  data: T | null;
  error: string | null;
  status: number;
  response: NextResponse | null;
}> {
  try {
    // Test the database connection first
    const connectionTest = await testConnection();
    if (!connectionTest.success) {
      console.error('Database connection test failed:', connectionTest.error);
      return {
        data: null,
        error: 'Database connection unavailable',
        status: 503,
        response: NextResponse.json(
          { error: 'Database connection unavailable', connectionError: true },
          { status: 503 }
        )
      };
    }
    
    // Execute the query function
    const result = await queryFn();
    
    return {
      data: result,
      error: null,
      status: 200,
      response: null
    };
  } catch (error) {
    console.error('Database error:', error);
    
    // Check for specific connection errors
    const errorString = String(error);
    const isConnError = 
      errorString.includes('ECONNREFUSED') || 
      errorString.includes('ENOTFOUND') || 
      errorString.includes('ECONNRESET');
    
    if (isConnError) {
      console.error('Database connection error detected:', errorString);
      return {
        data: null,
        error: 'Database connection failed',
        status: 503,
        response: NextResponse.json(
          { error: 'Database connection failed', connectionError: true },
          { status: 503 }
        )
      };
    }
    
    return {
      data: null,
      error: errorMessage,
      status: 500,
      response: NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    };
  }
}

/**
 * Convert a pg Pool query to use the neonClient
 * Example usage:
 * 
 * // Old code:
 * const result = await client.query('SELECT * FROM users');
 * 
 * // New code:
 * const result = await neonQuery('SELECT * FROM users', [param1, param2]);
 * 
 * @param queryText SQL query text
 * @param params Query parameters
 */
export async function neonQuery(queryText: string, params: any[] = []) {
  // For neonClient, we need to use SQL template literals differently
  // Since we can't dynamically create template literals, we'll use a different approach
  
  // Function to escape string values for SQL
  const escapeSql = (val: any): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val.toString();
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    
    // Escape strings - replace single quotes with two single quotes
    return `'${String(val).replace(/'/g, "''")}'`;
  };
  
  try {
    if (params.length === 0) {
      // No parameters - just execute the query directly
      return await neonClient([queryText] as any);
    } else {
      // Replace $1, $2, etc. with properly escaped values
      let sqlText = queryText;
      params.forEach((param, index) => {
        const placeholder = `\\$${index + 1}`;
        const regex = new RegExp(placeholder, 'g');
        sqlText = sqlText.replace(regex, escapeSql(param));
      });
      
      // Execute the query with replaced parameters
      return await neonClient([sqlText] as any);
    }
  } catch (error) {
    console.error('Error in neonQuery:', error);
    throw error;
  }
}
