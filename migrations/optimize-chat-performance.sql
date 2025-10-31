-- Optimize chat_messages table for better performance
-- Add indexes for frequently queried columns

-- Index for user_id and created_at (for latest messages per user)
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created 
ON chat_messages (user_id, created_at DESC);

-- Index for sender_type and read status (for unread counts)
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_read 
ON chat_messages (sender_type, read);

-- Composite index for unread message queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread_user 
ON chat_messages (user_id, sender_type, read) 
WHERE sender_type = 'user' AND read = FALSE;

-- Analyze table statistics after creating indexes
ANALYZE chat_messages;