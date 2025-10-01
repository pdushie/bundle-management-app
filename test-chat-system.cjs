// Test script for debugging chat system (CommonJS version)
require('dotenv').config();
const { neonClient } = require('./src/lib/db');

async function run() {
  try {
    console.log('Testing database connection for chat messages...');
    
    // Check if the chat_messages table exists
    const tableCheck = await neonClient`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'chat_messages'
      ) as exists
    `;
    console.log('chat_messages table exists:', tableCheck[0].exists);
    
    // Count all messages in the table
    const messageCount = await neonClient`
      SELECT COUNT(*) as count FROM chat_messages
    `;
    console.log('Total chat messages:', messageCount[0].count);
    
    // Look at all messages in the table
    const allMessages = await neonClient`
      SELECT * FROM chat_messages
      ORDER BY created_at DESC
    `;
    console.log('All chat messages:', allMessages);
    
    // Check the SQL used in the threads query
    console.log('\nChecking threads query...');
    const users = await neonClient`
      SELECT id, email, name FROM users
    `;
    console.log('Available users:', users);
    
    console.log('\nTrying threads query...');
    try {
      const threads = await neonClient`
        WITH latest_messages AS (
          SELECT 
            DISTINCT ON (user_id) user_id,
            id,
            admin_id,
            message,
            sender_type,
            read,
            created_at,
            updated_at
          FROM 
            chat_messages
          ORDER BY 
            user_id, created_at DESC
        ),
        unread_counts AS (
          SELECT 
            user_id,
            COUNT(*) as unread_count
          FROM 
            chat_messages
          WHERE 
            sender_type = 'user' AND read = FALSE
          GROUP BY 
            user_id
        )
        SELECT 
          u.id as user_id,
          u.name as user_name,
          u.email as user_email,
          lm.*,
          COALESCE(uc.unread_count, 0) as unread_count
        FROM 
          users u
        INNER JOIN 
          latest_messages lm ON u.id = lm.user_id
        LEFT JOIN 
          unread_counts uc ON u.id = uc.user_id
        ORDER BY 
          CASE WHEN uc.unread_count > 0 THEN 0 ELSE 1 END,
          lm.created_at DESC
      `;
      console.log('Threads result:', threads);
    } catch (error) {
      console.error('Error running threads query:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

run();
