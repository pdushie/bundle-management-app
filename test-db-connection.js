// Test script for database connection
import { neonClient, testConnection } from './src/lib/db.js';

async function run() {
  try {
    console.log('Testing database connection...');
    const result = await testConnection();
    console.log('Connection test result:', result);

    if (result.success) {
      console.log('Testing chat_messages table...');
      const tableCheck = await neonClient`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'chat_messages'
        ) as exists
      `;
      console.log('chat_messages table exists:', tableCheck[0].exists);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

run();
