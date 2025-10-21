-- Migration: Add minimum_order_entries column to users table
-- This allows setting different minimum entry requirements per user

ALTER TABLE users 
ADD COLUMN minimum_order_entries INTEGER DEFAULT 1 NOT NULL;

-- Update comment
COMMENT ON COLUMN users.minimum_order_entries IS 'Minimum number of entries required in an order for this user';

-- Create index for faster queries
CREATE INDEX idx_users_minimum_order_entries ON users(minimum_order_entries);

-- Set default minimum for existing users (you can adjust this value)
UPDATE users SET minimum_order_entries = 5 WHERE minimum_order_entries IS NULL OR minimum_order_entries < 1;
