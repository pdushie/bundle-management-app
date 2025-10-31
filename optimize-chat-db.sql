-- Chat Performance Optimization SQL Script
-- Run this directly in your database console

-- Add indexes for chat_messages table performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created 
ON chat_messages (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created_asc 
ON chat_messages (user_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_read 
ON chat_messages (sender_type, read);

CREATE INDEX IF NOT EXISTS idx_chat_messages_unread_user 
ON chat_messages (user_id, sender_type, read) 
WHERE sender_type = 'user' AND read = FALSE;

CREATE INDEX IF NOT EXISTS idx_chat_messages_unread_admin 
ON chat_messages (user_id, sender_type, read) 
WHERE sender_type = 'admin' AND read = FALSE;

-- Update table statistics
ANALYZE chat_messages;

-- Test the optimized query performance
EXPLAIN ANALYZE
SELECT DISTINCT ON (cm.user_id)
  cm.user_id,
  u.name as user_name,
  u.email as user_email,
  cm.id,
  cm.admin_id,
  cm.message,
  cm.sender_type,
  cm.read,
  cm.created_at,
  cm.updated_at,
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
  cm.created_at DESC;