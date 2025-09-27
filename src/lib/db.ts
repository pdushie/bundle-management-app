import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';  // Use neon-http adapter
import * as schema from './schema';

// Create a direct Neon SQL client for raw SQL queries
const createNeonClient = () => {
  try {
    // Validate DATABASE_URL before using it
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is not defined');
      throw new Error('DATABASE_URL environment variable is not defined');
    }
    
    return neon(process.env.DATABASE_URL, { 
      // Add additional fetch options for better reliability
      fetchOptions: {
        keepalive: true,
        timeout: 30000, // 30 second timeout
        cache: 'no-store'
      }
    });
  } catch (error) {
    console.error('Failed to create Neon SQL client:', error);
    throw error;
  }
};

export const neonClient = createNeonClient();

// We'll use the neonClient directly without custom wrapping, 
// as the wrapping was causing issues with the tagged template function

// Initialize Drizzle with the Neon client and schema
export const db = drizzle(neonClient, { 
  schema,
  // Add additional options if needed
  logger: process.env.NODE_ENV === 'development',
});

// Export a function to test the database connection with retries
export const testConnection = async (retries = 2) => {
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Database connection test attempt ${attempt + 1}/${retries + 1}`);
        // Add delay with exponential backoff between retries
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
      }
      
      // Simple query to test if the connection works using the tagged template syntax
      const result = await neonClient`SELECT 1 as test`;
      return { success: true, result };
    } catch (error) {
      lastError = error;
      console.error(`Database connection test failed (attempt ${attempt + 1}/${retries + 1}):`, error);
      
      // Check for specific error types that might indicate a need for different handling
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('timeout') || errorMsg.includes('econnreset')) {
          console.log('Network-related error detected, will retry with longer timeout');
        }
      }
    }
  }
  
  return { success: false, error: lastError };
};
