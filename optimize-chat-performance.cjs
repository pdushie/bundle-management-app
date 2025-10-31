#!/usr/bin/env node

// Script to optimize chat performance by adding database indexes
const { neonClient } = require('./src/lib/db');

async function optimizeChatPerformance() {
  console.log('🚀 Optimizing chat performance...\n');
  
  try {
    console.log('📊 Adding database indexes for chat_messages table...');
    
    // Index for user_id and created_at (for latest messages per user)
    await neonClient`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created 
      ON chat_messages (user_id, created_at DESC)
    `;
    console.log('✅ Created index: idx_chat_messages_user_created');
    
    // Index for sender_type and read status (for unread counts)
    await neonClient`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_read 
      ON chat_messages (sender_type, read)
    `;
    console.log('✅ Created index: idx_chat_messages_sender_read');
    
    // Composite index for unread message queries
    await neonClient`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_unread_user 
      ON chat_messages (user_id, sender_type, read) 
      WHERE sender_type = 'user' AND read = FALSE
    `;
    console.log('✅ Created partial index: idx_chat_messages_unread_user');
    
    // Analyze table statistics
    await neonClient`ANALYZE chat_messages`;
    console.log('✅ Updated table statistics');
    
    // Test query performance
    console.log('\n🧪 Testing query performance...');
    const start = performance.now();
    
    const testResult = await neonClient`
      EXPLAIN (ANALYZE, BUFFERS) 
      SELECT DISTINCT ON (cm.user_id)
        cm.user_id,
        u.name as user_name,
        u.email as user_email,
        cm.id,
        cm.message,
        cm.created_at,
        (
          SELECT COUNT(*)::int 
          FROM chat_messages 
          WHERE user_id = cm.user_id 
            AND sender_type = 'user' 
            AND read = FALSE
        ) as unread_count
      FROM 
        chat_messages cm
      INNER JOIN 
        users u ON cm.user_id = u.id
      ORDER BY 
        cm.user_id,
        cm.created_at DESC
      LIMIT 10
    `;
    
    const end = performance.now();
    console.log(`⚡ Query executed in ${(end - start).toFixed(2)}ms`);
    
    // Show query plan
    console.log('\n📋 Query execution plan:');
    testResult.forEach(row => {
      console.log(row['QUERY PLAN']);
    });
    
  } catch (error) {
    console.error('❌ Error during optimization:', error);
  }
  
  console.log('\n🏁 Chat performance optimization completed!');
  console.log('💡 Benefits:');
  console.log('  - Faster chat thread loading');
  console.log('  - Optimized unread message counting');
  console.log('  - Improved query performance with indexes');
}

// Run the optimization
optimizeChatPerformance().catch(console.error);